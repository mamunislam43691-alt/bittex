/**
 * emailService.js — OTP email delivery with SMTP fallback
 *
 * Strategy:
 *   1. Try SMTP with multiple ports in priority order (465 SSL → 587 STARTTLS)
 *   2. If Gmail completely blocked, fall back to a generic SMTP provider if set
 *      (MAIL_HOST_OVERRIDE / MAIL_PORT_OVERRIDE env vars)
 *   3. ALWAYS persist OTP to database first. Email delivery is best-effort.
 *   4. If email send fails, return { ok: false, otpPersisted: true, reason }
 *      so the route handler can decide whether to surface the failure or
 *      fall back to a different delivery method.
 *
 * Important: even when Gmail fully fails, the OTP code is still valid —
 * admin can use the Admin → "Resend OTP" button to manually share it.
 */

const nodemailer = require('nodemailer')

/** ─── Load credentials: process.env → fallback DB ─── */
async function getGmailCredentials() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    }
  }
  try {
    const Settings = require('../models/Settings')
    const s = await Settings.findOne({ key: 'email' }).lean()
    if (s?.value?.gmailUser && s?.value?.gmailAppPass) {
      process.env.GMAIL_USER         = s.value.gmailUser
      process.env.GMAIL_APP_PASSWORD = s.value.gmailAppPass
      return { user: s.value.gmailUser, pass: s.value.gmailAppPass }
    }
  } catch {}
  return null
}

/** ─── Override SMTP (when Gmail is blocked, use SendGrid/Mailgun/etc.) ─── */
function getCustomSmtpConfig() {
  if (process.env.MAIL_HOST && process.env.MAIL_PORT) {
    return {
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      user: process.env.MAIL_USER    || process.env.GMAIL_USER,
      pass: process.env.MAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD,
      secure: (process.env.MAIL_SECURE || 'true') === 'true',
    }
  }
  return null
}

/**
 * Try a list of SMTP transports until one verifies successfully.
 * Returns { transporter, used } or throws if all fail.
 */
async function buildTransporter() {
  const creds = await getGmailCredentials()
  if (!creds) {
    throw new Error('Gmail credentials not configured. Set them in Admin → Settings → Email.')
  }

  // 1. Custom SMTP override (admin set MAIL_HOST_OVERRIDE)
  const custom = getCustomSmtpConfig()
  const candidates = custom
    ? [{ host: custom.host, port: custom.port, secure: custom.secure, label: `custom:${custom.host}:${custom.port}`, ...creds }]
    : [
        { host: 'smtp.gmail.com', port: 465, secure: true,  label: 'gmail:465 (SSL)',          ...creds },
        { host: 'smtp.gmail.com', port: 587, secure: false, label: 'gmail:587 (STARTTLS)',     ...creds },
      ]

  const baseOpts = {
    auth: { user: creds.user, pass: creds.pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 8000,
    greetingTimeout:   6000,
    socketTimeout:     12000,
    debug: false,
  }

  const errors = []
  for (const c of candidates) {
    const t = nodemailer.createTransport({
      ...baseOpts,
      host: c.host,
      port: c.port,
      secure: c.secure,
    })
    try {
      await t.verify()
      console.log(`✓ SMTP transport verified via ${c.label}`)
      return { transporter: t, used: c.label }
    } catch (err) {
      // Tear down — close the failed transporter
      try { t.close() } catch {}
      errors.push(`${c.label}: ${err.code || err.message?.slice(0, 60)}`)
      // Try next candidate
    }
  }
  throw new Error(`All SMTP transports failed → ${errors.join(' | ')}`)
}

/** ─── Beautiful HTML email template ─── */
function buildVerifyEmailHTML({ name, otp, expiresMin, type }) {
  const isReset = type === 'reset'
  const title = isReset ? 'Password Reset Request' : 'Verify Your Email Address'
  const heading = isReset ? 'Reset Your Password' : 'Confirm Your Email'
  const msg = isReset
    ? 'You requested to reset your BITTX SMS account password. Use the code below to proceed:'
    : 'Welcome to BITTX SMS! Please use the verification code below to confirm your email address:'
  const footerMsg = isReset
    ? 'If you did not request a password reset, please ignore this email and your password will remain unchanged.'
    : 'If you did not create a BITTX SMS account, please ignore this email.'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;padding:14px 24px;display:inline-block;">
                    <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚡ BITTX SMS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px 40px;text-align:center;">
                    <div style="width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                      <span style="font-size:28px;">${isReset ? '🔑' : '✉️'}</span>
                    </div>
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">${heading}</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">BITTX SMS Platform</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Hi <strong>${name}</strong>,</p>
                    <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.7;">${msg}</p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center">
                          <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px dashed #93c5fd;border-radius:16px;padding:24px;display:inline-block;min-width:240px;">
                            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;">Your ${isReset ? 'Reset' : 'Verification'} Code</p>
                            <p style="margin:0;font-size:42px;font-weight:900;color:#1e3a8a;letter-spacing:0.3em;font-family:monospace;">${otp}</p>
                            <p style="margin:8px 0 0;font-size:12px;color:#64748b;">⏱ Expires in <strong>${expiresMin} minutes</strong></p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="background:#f8fafc;border-radius:12px;padding:18px 20px;border-left:4px solid #2563eb;margin-bottom:24px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e293b;">🔒 Security Reminder</p>
                      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                        • Never share this code with anyone<br/>
                        • BITTX SMS will never ask for this code via phone or chat<br/>
                        • ${footerMsg}
                      </p>
                    </div>

                    <p style="margin:0;font-size:13px;color:#94a3b8;">
                      Need help? Contact us at
                      <a href="mailto:support@bittxsms.com" style="color:#2563eb;text-decoration:none;font-weight:600;"> support@bittxsms.com</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="color:#2563eb;text-decoration:none;font-weight:600;">BITTX SMS</a>
                &nbsp;·&nbsp; Real-Time OTP Platform
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                © ${new Date().getFullYear()} BITTX SMS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Send OTP email — tolerant of SMTP failure.
 * Returns { sent, mode, error?, usedTransport? }
 *   sent=true  → email delivered
 *   sent=false → email failed BUT OTP still saved in DB
 *
 * Caller should not throw — they decide policy (e.g. dev mode dev mode prints OTP,
 * prod mode shows admin/banner notification).
 */
async function sendOTPEmail({ to, name, otp, expiresMin = 10, type = 'verify', devMode = false }) {
  let transporter, used
  try {
    ({ transporter, used } = await buildTransporter())
  } catch (err) {
    if (devMode) {
      console.log(`🛠 DEV MODE — STMP unavailable (${err.message.slice(0, 80)}) — Use this code: ${otp}`)
      return { sent: false, mode: 'dev-fallback', error: err.message, otp, devMode: true }
    }
    return { sent: false, mode: 'failed', error: err.message }
  }

  const subject = type === 'reset'
    ? '🔑 BITTX SMS – Password Reset Code'
    : '✉️ BITTX SMS – Email Verification Code'

  const mailOptions = {
    from: `"BITTX SMS" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: buildVerifyEmailHTML({ name, otp, expiresMin, type }),
    text: `Your BITTX SMS ${type === 'reset' ? 'password reset' : 'verification'} code: ${otp}\nExpires in ${expiresMin} minutes.`,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`✓ Email sent to ${to} via ${used}`)
    return { sent: true, mode: 'email', usedTransport: used }
  } catch (err) {
    let detail = err.message || String(err)
    if (err.code === 'EAUTH') detail = 'Gmail credentials rejected — verify user / app password'
    if (err.code === 'EENVELOPE') detail = `Bad recipient: ${err.response}`
    console.error(`✗ Email send failed via ${used}: ${detail}`)
    if (devMode) {
      console.log(`🛠 DEV MODE — SMTP error: ${detail} — Use this code: ${otp}`)
      return { sent: false, mode: 'dev-fallback', error: detail, otp, devMode: true }
    }
    return { sent: false, mode: 'failed', error: detail }
  } finally {
    try { transporter.close() } catch {}
  }
}

module.exports = { sendOTPEmail, buildVerifyEmailHTML }
