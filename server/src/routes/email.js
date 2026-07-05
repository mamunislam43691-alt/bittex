const express = require('express')
const router = express.Router()
const { sendOTPEmail } = require('../services/emailService')

/* ─── In-memory OTP store ────────────────────────────────────────
   Structure: email → { otp, expires, sentAt, attempts, type, timer }
   - Verify করলে → তৎক্ষণাৎ delete
   - Expire হলে → setTimeout-এ delete
   - Too many attempts → তৎক্ষণাৎ delete
   ─────────────────────────────────────────────────────── */
const otpStore = new Map()

const OTP_EXPIRY_MS = 10 * 60 * 1000  // 10 minutes
const MAX_ATTEMPTS  = 5
const RESEND_DELAY  = 60 * 1000       // 1 minute between resends

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Delete OTP entry and cancel its auto-cleanup timer */
function deleteOTP(email) {
  const record = otpStore.get(email)
  if (record?.timer) clearTimeout(record.timer)
  otpStore.delete(email)
}

/* ── POST /api/email/check-email ──
   Check if an account exists in DB for password reset
   Body: { email }  */
router.post('/check-email', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email required' })
  try {
    const { findAnyByEmail } = require('../db')
    const account = await findAnyByEmail(email.toLowerCase().trim())
    if (!account) return res.status(404).json({ message: 'No account found with this email address' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

/* ── POST /api/email/send-otp ──
   Body: { email, name, type: 'verify' | 'reset', devMode? }
   Sends a 6-digit OTP to the given email — but never fails the request if email fails.
   If email send fails, OTP is still saved on the server and the response flags devMode
   so the frontend can surface the code if needed. */
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, type = 'verify', devMode = false } = req.body
    if (!email || !name) return res.status(400).json({ message: 'Email and name are required' })

    // Resend throttle
    const existing = otpStore.get(email)
    if (existing && existing.sentAt && Date.now() - existing.sentAt < RESEND_DELAY) {
      const waitSec = Math.ceil((RESEND_DELAY - (Date.now() - existing.sentAt)) / 1000)
      return res.status(429).json({ message: `Please wait ${waitSec}s before requesting a new code` })
    }

    // Cancel any previous OTP timer before issuing a new one
    if (existing?.timer) clearTimeout(existing.timer)

    const otp     = generateOTP()
    const expires = Date.now() + OTP_EXPIRY_MS
    const sentAt  = Date.now()

    const timer = setTimeout(() => otpStore.delete(email), OTP_EXPIRY_MS)
    otpStore.set(email, { otp, expires, sentAt, attempts: 0, type, timer })

    // Send email — never throw; service returns mode/sent/error/otp-for-dev-mode
    const result = await sendOTPEmail({
      to: email, name, otp, expiresMin: 10, type, devMode,
    })

    if (result.sent) {
      return res.json({
        success: true,
        delivered: 'email',
        message: 'Verification code sent to your email',
      })
    }

    // Email send failed. OTP is still saved on the server, so the user can:
    //   - Wait for SMTP to recover and Retry (this endpoint)
    //   - Use dev-mode OTP (returned only when explicitly requested by devMode flag)
    //   - Admin can manually resend via Admin → Email Resend button
    console.warn(`⚠ Email not sent to ${email} via ${result.mode}: ${result.error?.slice(0,120)}`)
    return res.json({
      success: true,                       // request succeeded — OTP IS recorded
      delivered: result.mode,              // 'failed' | 'dev-fallback'
      message: result.mode === 'dev-fallback'
        ? 'Email delivery not available — verify using the code shown in the app.'
        : 'OTP was generated but email delivery failed. Please contact admin or try again.',
      ...(devMode && result.otp ? { otp: result.otp } : {}),
      // Admin can read this error in logs:
      ...(process.env.NODE_ENV !== 'production' ? { error: result.error } : {}),
    })
  } catch (err) {
    console.error('Send-OTP handler error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/* ── POST /api/email/verify-otp ──
   Body: { email, otp }
   Returns: { success: true } or error */
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' })

  const record = otpStore.get(email)
  if (!record) return res.status(400).json({ message: 'No verification code found. Please request a new one.', code: 'NOT_FOUND' })

  // Check expiry
  if (Date.now() > record.expires) {
    deleteOTP(email)   // cleanup immediately
    return res.status(400).json({ message: 'Code has expired. Please request a new one.', code: 'EXPIRED' })
  }

  // Too many attempts
  record.attempts++
  if (record.attempts > MAX_ATTEMPTS) {
    deleteOTP(email)   // cleanup immediately
    return res.status(400).json({ message: 'Too many attempts. Please request a new code.', code: 'TOO_MANY_ATTEMPTS' })
  }

  // Wrong code
  if (record.otp !== otp.trim()) {
    return res.status(400).json({
      message: `Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempts remaining.`,
      code: 'INVALID',
      attemptsLeft: MAX_ATTEMPTS - record.attempts,
    })
  }

  // ✅ Valid — delete immediately, no need to wait for timer
  deleteOTP(email)
  res.json({ success: true, message: 'Email verified successfully' })
})

/* ── POST /api/email/reset-password ──
   After OTP verified, update password in DB
   Body: { email, newPassword }  */
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body
  if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password required' })
  try {
    const { findAnyByEmail, Admins, Agents, Users } = require('../db')
    const account = await findAnyByEmail(email.toLowerCase().trim())
    if (!account) return res.status(404).json({ message: 'No account found with this email' })

    const id  = String(account._id || account.id)
    const col = account._collection
    if      (col === 'admins')  await Admins.update(id,  { password: newPassword })
    else if (col === 'agents')  await Agents.update(id,  { password: newPassword })
    else                        await Users.update(id,   { password: newPassword })

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(500).json({ message: 'Failed to reset password' })
  }
})

/* ── POST /api/email/config ── (admin only — save Gmail config) */
router.post('/config', async (req, res) => {
  const { gmailUser, gmailAppPass } = req.body
  if (!gmailUser || !gmailAppPass) return res.status(400).json({ message: 'Gmail user and app password required' })
  try {
    // Save to Settings collection
    const Settings = require('../models/Settings')
    await Settings.bulkWrite([
      { updateOne: { filter: { key: 'email' }, update: { $set: { value: { gmailUser, gmailAppPass } } }, upsert: true } }
    ])
    process.env.GMAIL_USER         = gmailUser
    process.env.GMAIL_APP_PASSWORD = gmailAppPass
    res.json({ success: true, message: 'Email configuration saved' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to save email config' })
  }
})

/* ── GET /api/email/status ── (admin — diagnostic)
    Returns SMTP connector status so admin panel can show a banner. */
router.get('/status', async (req, res) => {
  try {
    const { buildTransporter } = (() => null)()  // not exported — we replicate below
    const creds = await (await import('../services/emailService')).sendOTPEmail
      ? null : null
    // Lightweight version: just check creds + try fallback candidates
    const { sendOTPEmail } = require('../services/emailService')
    const e = process.env.GMAIL_USER
    const hasDbCreds = await (async () => {
      try {
        const Settings = require('../models/Settings')
        const s = await Settings.findOne({ key: 'email' }).lean()
        return !!s?.value?.gmailUser
      } catch { return false }
    })()
    res.json({
      configured: !!e || hasDbCreds,
      gmailUser: e || null,
      customSmtp: !!(process.env.MAIL_HOST),
    })
  } catch (err) { res.status(500).json({ message: 'status check failed' }) }
})

module.exports = router
