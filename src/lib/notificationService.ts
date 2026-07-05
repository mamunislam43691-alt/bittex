/**
 * notificationService.ts
 * Browser Push Notification + Audio alert when OTP arrives.
 *
 * Usage:
 *   import { requestPermission, notifyOTP } from '../lib/notificationService'
 *   await requestPermission()
 *   notifyOTP({ number: '224659...', otp: '837261', service: 'Facebook' })
 */

const APP_NAME = 'BITTX SMS'
const ICON_URL  = '/favicon.svg'

/* ── Permission ─────────────────────────────────────────── */

/** Request browser notification permission. Returns the permission state. */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied')  return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

/* ── Audio ──────────────────────────────────────────────── */

/**
 * Play a short notification beep using the Web Audio API.
 * No external file needed — generated entirely in-browser.
 */
export function playOTPSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const playTone = (freq: number, startTime: number, duration: number, gain = 0.35) => {
      const osc  = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.start(startTime)
      osc.stop(startTime + duration + 0.05)
    }

    const now = ctx.currentTime
    // Three-tone rising chime: ding ding ding ✓
    playTone(880, now,       0.12)   // A5
    playTone(1046, now + 0.14, 0.12) // C6
    playTone(1318, now + 0.28, 0.22) // E6 — held longer

    // Auto-close audio context after the chime
    setTimeout(() => { try { ctx.close() } catch {} }, 700)
  } catch {
    // AudioContext not available — silent fail
  }
}

/* ── Notification ───────────────────────────────────────── */

export interface OTPNotifyPayload {
  number:  string
  otp:     string
  service?: string
  earned?: number
}

/**
 * Show a browser push notification for an incoming OTP.
 * Also plays the audio chime.
 */
export function notifyOTP(payload: OTPNotifyPayload) {
  // Always play sound (no permission needed for audio)
  playOTPSound()

  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const { number, otp, service, earned } = payload
  const svcLabel = service ? `${service} ` : ''
  const shortNum = number.length > 8 ? '...' + number.slice(-6) : number

  const title = `✅ OTP Arrived — ${svcLabel}Code: ${otp}`
  const body  = [
    `Number: ${shortNum}`,
    service ? `Service: ${service}` : '',
    earned != null ? `Earned: $${earned.toFixed(4)}` : '',
  ].filter(Boolean).join('\n')

  try {
    const n = new Notification(title, {
      body,
      icon: ICON_URL,
      badge: ICON_URL,
      tag:  `otp-${number}`,   // replaces previous notification for same number
      renotify: true,
      silent: false,
    } as NotificationOptions)

    // Auto-close after 8 seconds
    setTimeout(() => { try { n.close() } catch {} }, 8000)

    // Click → focus the tab
    n.onclick = () => {
      try { window.focus() } catch {}
      n.close()
    }
  } catch {
    // Notification API error — silent fail
  }
}

/**
 * Show a browser notification for a generic message.
 * Does NOT play the OTP chime.
 */
export function notifyGeneral(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, icon: ICON_URL, tag: 'bittx-general' })
    setTimeout(() => { try { n.close() } catch {} }, 6000)
  } catch {}
}
