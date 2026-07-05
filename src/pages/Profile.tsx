import { useState, useRef } from 'react'
import { User, Shield, Key, Monitor, Check, Save, Smartphone, Mail, Camera, Lock, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { sendVerificationEmail, verifyOTPRemote } from '../lib/emailService'
import { COUNTRIES } from '../lib/countries'
import { profileApi } from '../lib/api'

const timezones = [
  'UTC+0', 'UTC-5 (EST)', 'UTC-8 (PST)', 'UTC+1 (CET)', 'UTC+3 (MSK)',
  'UTC+5:30 (IST)', 'UTC+8 (CST)', 'UTC+9 (JST)', 'UTC+10 (AEST)',
]

// Sessions are loaded from user object — no hardcoded data
/* ── OTP Confirm Modal ── */
function OtpConfirmModal({ email, title, desc, onVerified, onClose }: {
  email: string; title: string; desc: string
  onVerified: () => void; onClose: () => void
}) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [status, setStatus] = useState<'idle' | 'invalid' | 'expired' | 'error'>('idle')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendT, setResendT] = useState(0)
  const [devMode, setDevMode] = useState(false)

  // Auto-send on mount
  useState(() => { sendCode() })

  async function sendCode() {
    setSending(true)
    const r = await sendVerificationEmail(email, 'User', '', 'verify')
    setSending(false); setSent(true); setResendT(60)
    const local = sessionStorage.getItem(`otp_${email}`)
    if (local) setDevMode(true)
    // Countdown
    const t = setInterval(() => setResendT(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 }), 1000)
  }

  const handleChange = (i: number, v: string) => {
    const val = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = val; setDigits(next); setStatus('idle')
    if (val && i < 5) document.getElementById(`sec-otp-${i + 1}`)?.focus()
  }
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) document.getElementById(`sec-otp-${i - 1}`)?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setDigits(p.split('')); setStatus('idle') }
    e.preventDefault()
  }

  const otp = digits.join('')

  const handleVerify = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    const r = await verifyOTPRemote(email, otp)
    if (r === 'valid') { onVerified(); onClose() }
    else setStatus(r === 'expired' ? 'expired' : 'invalid')
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 20,
        width: 380, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
          padding: '20px 22px', textAlign: 'center'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
          }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>{desc}</p>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {sending && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              <div style={{
                width: 20, height: 20, border: '2.5px solid #7c3aed', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px'
              }} />
              Sending code to your email...
            </div>
          )}
          {sent && !sending && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Code sent to <strong style={{ color: '#7c3aed' }}>{email}</strong>
            </p>
          )}

          {devMode && (
            <div style={{
              background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8,
              padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#92400e'
            }}>
              🛠 Dev Mode — Use code: <code style={{ fontWeight: 900, fontSize: 14, letterSpacing: '0.2em' }}>123456</code>
            </div>
          )}

          {/* 6-box OTP */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {digits.map((d, i) => (
              <input key={i} id={`sec-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                value={d} onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)} onPaste={i === 0 ? handlePaste : undefined}
                style={{
                  width: 44, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 800,
                  borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                  border: `2px solid ${status === 'invalid' || status === 'expired' ? '#ef4444' : d ? '#7c3aed' : '#e2e8f0'}`,
                  background: status === 'invalid' ? '#fef2f2' : '#fff', color: '#1e293b'
                }} />
            ))}
          </div>

          {status === 'invalid' && <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>✕ Incorrect code</p>}
          {status === 'expired' && <p style={{ textAlign: 'center', color: '#f59e0b', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⏰ Code expired — resend below</p>}

          <button onClick={handleVerify} disabled={otp.length < 6 || loading}
            style={{
              width: '100%', padding: '11px', borderRadius: 11, fontSize: 14, fontWeight: 700, marginBottom: 12,
              background: otp.length < 6 || loading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              color: otp.length < 6 || loading ? '#94a3b8' : '#fff', border: 'none',
              cursor: otp.length < 6 || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
            {loading
              ? <><div style={{ width: 15, height: 15, border: '2.5px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Verifying...</>
              : <><ShieldCheck size={15} /> Confirm</>
            }
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#94a3b8', fontWeight: 600
            }}>Cancel</button>
            {resendT > 0
              ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Resend in {resendT}s</span>
              : <button onClick={sendCode} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#7c3aed', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <RefreshCw size={11} /> Resend Code
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Toggle switch ── */
function Toggle({ value, onChange, accentColor }: { value: boolean; onChange: () => void; accentColor: string }) {
  return (
    <button
      onClick={onChange}
      aria-checked={value}
      role="switch"
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? accentColor : '#cbd5e1',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        padding: 0, outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
        left: value ? 23 : 3,
      }} />
    </button>
  )
}

export default function Profile() {
  const { username, setUsername, accentColor, photoUrl, setPhotoUrl } = useTheme()
  const { user, refreshUser } = useAuth()

  const userEmail = user?.email || 'your@email.com'
  const userPhone = user?.phone || ''
  const userAgentEmail = (user as any)?.agentEmail || ''
  const userJoinedAt = user?.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'
  const userTotalEarned = (user as any)?.totalEarned || 0
  const userId = user?.id || user?._id || ''
  // Short UID from last 10 chars of MongoDB _id
  const publicUid = userId ? '#' + String(userId).slice(-10).toUpperCase() : '—'
  const sessions = (user as any)?.sessions || []

  /* ── Photo upload ── */
  const [avatarHover, setAvatarHover] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhotoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  /* ── Form state — pre-filled from DB ── */
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [bio, setBio] = useState((user as any)?.bio || '')
  const [country, setCountry] = useState(user?.country || 'Bangladesh')
  const [city, setCity] = useState((user as any)?.city || '')
  const [birthDate, setBirthDate] = useState((user as any)?.birthDate || '')
  const [timezone, setTimezone] = useState((user as any)?.timezone || 'UTC+0')
  const [address, setAddress] = useState((user as any)?.address || '')
  const [telegram, setTelegram] = useState((user as any)?.telegram || '')
  const [notifChannel, setNotifChannel] = useState('Email')
  const [notifications, setNotifications] = useState(true)
  const [saved, setSaved] = useState(false)

  // 2-step state — loaded from user object (DB), saved via profile API
  const [twoStepLogin, setTwoStepLogin] = useState(() => (user as any)?.twoFALogin ?? false)
  const [twoStepPayments, setTwoStepPayments] = useState(() => (user as any)?.twoFAPayments ?? false)

  // OTP modal state
  const [otpModal, setOtpModal] = useState<{
    type: 'login' | 'payments'
    targetValue: boolean
  } | null>(null)

  const save2FA = async (login: boolean, payments: boolean) => {
    try {
      await profileApi.update({ twoFALogin: login, twoFAPayments: payments })
      await refreshUser()
    } catch {}
  }

  const handleToggle2Step = (type: 'login' | 'payments') => {
    const current = type === 'login' ? twoStepLogin : twoStepPayments
    const targetValue = !current
    // Turning OFF doesn't need OTP — just turn off
    if (!targetValue) {
      if (type === 'login') { setTwoStepLogin(false); save2FA(false, twoStepPayments) }
      else { setTwoStepPayments(false); save2FA(twoStepLogin, false) }
      return
    }
    // Turning ON — requires OTP verification
    setOtpModal({ type, targetValue })
  }

  const handleOtpVerified = () => {
    if (!otpModal) return
    if (otpModal.type === 'login') {
      setTwoStepLogin(true); save2FA(true, twoStepPayments)
    } else {
      setTwoStepPayments(true); save2FA(twoStepLogin, true)
    }
    setOtpModal(null)
  }

  const handleSave = async () => {
    try {
      await profileApi.update({ firstName, lastName, bio, country, city, birthDate, timezone, address })
      await refreshUser()
      setUsername(firstName || lastName || username)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('Profile save error:', e)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/30'
  const readCls = 'w-full px-3 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed'

  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ''}`.toUpperCase()

  return (
    <div className="page-wrap">

      {/* OTP Confirmation Modal */}
      {otpModal && (
        <OtpConfirmModal
          email={userEmail}
          title={otpModal.type === 'login' ? 'Enable 2-Step Login' : 'Enable 2-Step Payments'}
          desc={otpModal.type === 'login'
            ? 'Verify your email to enable 2-step verification for login'
            : 'Verify your email to enable 2-step verification for withdrawals'}
          onVerified={handleOtpVerified}
          onClose={() => setOtpModal(null)}
        />
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 18 }}>🗂️</span>
          <h1 className="page-title" style={{ margin: 0 }}>Profile</h1>
        </div>
        <p className="page-sub">Manage personal info, security and API keys.</p>
      </div>

      {/* ── Welcome + Account Overview row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Welcome card */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Avatar with camera overlay */}
          <div
            style={{ position: 'relative', flexShrink: 0 }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            onClick={() => fileRef.current?.click()}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="avatar"
                style={{
                  width: 68, height: 68, borderRadius: '50%',
                  objectFit: 'cover', border: `3px solid ${accentColor}`,
                  cursor: 'pointer',
                }}
              />
            ) : (
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800, color: '#fff',
                cursor: 'pointer', border: `3px solid ${accentColor}`,
                userSelect: 'none',
              }}>
                {initials}
              </div>
            )}
            {/* camera overlay */}
            {avatarHover && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <Camera size={20} color="#fff" />
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4
            }}>
              WELCOME BACK
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
              {firstName} {lastName}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last login: {user?.lastLogin ? new Date(user.lastLogin as any).toLocaleString() : '—'}
            </p>
          </div>
        </div>

        {/* Account Overview card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} className="text-slate-400" />
              <h3 className="card-title">Account Overview</h3>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: '#dcfce7', color: '#16a34a'
            }}>ACTIVE</span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <p style={{
                fontSize: 11, fontWeight: 600, color: '#92400e',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4
              }}>
                LIFE TIME EARNING
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>USD {userTotalEarned.toFixed(2)}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>MEMBER SINCE</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{userJoinedAt}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>PUBLIC UID</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{publicUid}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main row: Personal Info (left 2/3) + right sidebar (1/3) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Personal Information card ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 22px', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} className="text-slate-400" />
              <h2 className="card-title">Personal Information</h2>
            </div>
            {/* Public UID badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              background: `${accentColor}15`, color: accentColor,
              fontFamily: 'monospace', letterSpacing: '0.04em',
            }}>
              {publicUid}
            </span>
          </div>

          <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <div>
              <label className="form-label">FIRST NAME</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="form-label">LAST NAME</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="form-label">EMAIL (READ-ONLY)</label>
              <div style={{ position: 'relative' }}>
                <input value={userEmail} readOnly className={readCls} />
                <Mail size={13} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: '#cbd5e1'
                }} />
              </div>
            </div>

            <div>
              <label className="form-label">PHONE (READ-ONLY)</label>
              <div style={{ position: 'relative' }}>
                <input value={userPhone} readOnly className={readCls} />
                <Smartphone size={13} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: '#cbd5e1'
                }} />
              </div>
            </div>
            <div>
              <label className="form-label">BIO</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Tell us about yourself..."
                style={{ resize: 'vertical' }} className={inputCls} />
            </div>

            <div>
              <label className="form-label">COUNTRY</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className={inputCls}>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">CITY</label>
              <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="form-label">BIRTH DATE</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="form-label">TIMEZONE</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls}>
                {timezones.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">ADDRESS</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                style={{ resize: 'vertical' }} className={inputCls} />
            </div>

            <div>
              <label className="form-label">TELEGRAM USERNAME (READ-ONLY)</label>
              <div style={{ display: 'flex' }}>
                <span style={{
                  padding: '10px 12px', fontSize: 14, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', borderRight: 'none',
                  borderRadius: '8px 0 0 8px', color: 'var(--text-secondary)'
                }}>@</span>
                <input value={telegram} readOnly
                  style={{ borderRadius: '0 8px 8px 0' }} className={readCls} />
              </div>
            </div>
            <div>
              <label className="form-label">NOTIFICATION CHANNEL</label>
              <select value={notifChannel} onChange={e => setNotifChannel(e.target.value)} className={inputCls}>
                <option>Email</option>
                <option>Telegram</option>
                <option>SMS</option>
                <option>None</option>
              </select>
            </div>

            {/* Notifications toggle */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle value={notifications} onChange={() => setNotifications(v => !v)} accentColor={accentColor} />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Notifications {notifications ? 'Enabled' : 'Disabled'}
              </span>
            </div>

          </div>

          {/* Save button row */}
          <div style={{
            padding: '14px 22px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12
          }}>
            <button style={{
              fontSize: 14, fontWeight: 600, padding: '9px 20px',
              borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-secondary)', cursor: 'pointer'
            }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                fontSize: 14, fontWeight: 700, padding: '9px 22px',
                borderRadius: 10, background: accentColor, color: '#fff',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {saved
                ? <><Check size={15} /> Saved!</>
                : <><Lock size={15} /> Save Changes (OTP)</>}
            </button>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Security Status */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 18px', borderBottom: '1px solid var(--border)'
            }}>
              <Shield size={15} className="text-slate-400" />
              <h3 className="card-title">Security Status</h3>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* 2-Step Login */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${twoStepLogin ? '#e9d5ff' : '#e2e8f0'}`,
                background: twoStepLogin ? '#faf5ff' : '#fff',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🔐</span>
                    <div>
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: twoStepLogin ? '#7c3aed' : 'var(--text-secondary)', margin: 0
                      }}>
                        2 STEP (Login)
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                        OTP required at every login
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {twoStepLogin && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 20, background: '#ede9fe', color: '#7c3aed'
                      }}>ON</span>
                    )}
                    <Toggle value={twoStepLogin} onChange={() => handleToggle2Step('login')} accentColor={accentColor} />
                  </div>
                </div>
              </div>

              {/* 2-Step Payments */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${twoStepPayments ? '#e9d5ff' : '#e2e8f0'}`,
                background: twoStepPayments ? '#faf5ff' : '#fff',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💳</span>
                    <div>
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: twoStepPayments ? '#7c3aed' : 'var(--text-secondary)', margin: 0
                      }}>
                        2 STEP (Payments)
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                        OTP required before withdrawal
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {twoStepPayments && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 20, background: '#ede9fe', color: '#7c3aed'
                      }}>ON</span>
                    )}
                    <Toggle value={twoStepPayments} onChange={() => handleToggle2Step('payments')} accentColor={accentColor} />
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: '#f8fafc',
                border: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', lineHeight: 1.5
              }}>
                🔒 Enabling 2-step verification adds an extra layer of security.
                A code will be sent to <strong>{userEmail}</strong> each time.
              </div>
            </div>
          </div>

          {/* API Keys section removed — now available at /api-key page */}
        </div>
      </div>

      {/* ── Sessions — full width ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px', borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={15} className="text-slate-400" />
            <h3 className="card-title">Sessions</h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last {sessions.length} sessions</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
                {['WHEN', 'IP', 'DEVICE', 'STATUS'].map(h => (
                  <th key={h} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '8px 22px', textAlign: 'left'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((user as any)?.sessions || []).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No sessions found</td></tr>
              ) : ((user as any)?.sessions || []).map((s: any, i: number) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td style={{ padding: '14px 22px', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {s.loginAt ? new Date(s.loginAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '14px 22px', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {s.ip || '—'}
                  </td>
                  <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.device || s.browser || '—'}
                  </td>
                  <td style={{ padding: '14px 22px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                      {i === 0 ? 'Active (Current)' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
