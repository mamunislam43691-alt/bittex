/* ─────────────────────────────────────────────────────────────────
   Email Service — calls our own Node.js backend (server/src/routes/email.js)
   which uses Gmail SMTP via Nodemailer.
   ─────────────────────────────────────────────────────────────────*/

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const OTP_EXPIRY_MINUTES = 10

/* Send OTP to email via backend */
export async function sendVerificationEmail(
  email: string,
  name: string,
  _otp: string,  // otp is generated server-side now
  type: 'verify' | 'reset' = 'verify'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, type }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: 'Cannot connect to email server. Please try again.' }
  }
}

/* Verify OTP via backend */
export async function verifyOTPRemote(
  email: string,
  otp: string
): Promise<'valid' | 'expired' | 'invalid' | 'error'> {
  try {
    const res = await fetch(`${API_BASE}/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json()
    if (res.ok) return 'valid'
    if (data.code === 'EXPIRED') return 'expired'
    return 'invalid'
  } catch {
    return 'error'
  }
}
