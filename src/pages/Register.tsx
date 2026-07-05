import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Check, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { COUNTRIES } from '../lib/countries'
import { sendVerificationEmail, verifyOTPRemote, OTP_EXPIRY_MINUTES } from '../lib/emailService'
import { normalizeEmail, authApi } from '../lib/api'
import { BittxLogoIcon } from '../components/BittxLogo'

type Step = 'form' | 'verify' | 'success'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  // Force light mode on auth pages — these are always light
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  // Load registration settings from DB
  const [regSettings, setRegSettings] = useState<{
    enabled: boolean
    status: 'allowed' | 'disabled' | 'window_closed'
    regStart: string
    regEnd: string
  }>({ enabled: true, status: 'allowed', regStart: '', regEnd: '' })
  const [regLoading, setRegLoading] = useState(true)

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    fetch(`${BASE}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const platform = data.platform || {}
          const regData = data.registration || {}
          const regStart = regData.startTime || ''
          const regEnd = regData.endTime || ''
          let status: 'allowed' | 'disabled' | 'window_closed' = 'allowed'

          if (platform.registrationEnabled === false) {
            status = 'disabled'
          } else if (regStart && regEnd) {
            const now = Date.now()
            const start = new Date(regStart).getTime()
            const end = new Date(regEnd).getTime()
            if (now < start || now > end) status = 'window_closed'
          } else if (regStart) {
            const now = Date.now()
            const start = new Date(regStart).getTime()
            if (now < start) status = 'window_closed'
          }

          setRegSettings({ enabled: status === 'allowed', status, regStart, regEnd })
        }
      })
      .catch(() => {}) // server unreachable → allow registration (fail open)
      .finally(() => setRegLoading(false))
  }, [])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [usernameError, setUsernameError] = useState('')
  const [email, setEmail] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('Bangladesh')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const [step, setStep] = useState<Step>('form')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpStatus, setOtpStatus] = useState<'idle' | 'valid' | 'invalid' | 'expired' | 'error'>('idle')
  const [resendTimer, setResendTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [agentError, setAgentError] = useState('')
  const [agentChecking, setAgentChecking] = useState(false)

  // ── All hooks MUST be before any conditional returns (React rules of hooks) ──
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setInterval(() => setResendTimer(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendTimer])

  // Username availability check with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      setUsernameError('')
      return
    }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const data = await authApi.checkUsername(username)
        if (data.available) {
          setUsernameStatus('available')
          setUsernameError('')
        } else {
          setUsernameStatus('taken')
          setUsernameError(data.message || 'Username already taken')
        }
      } catch {
        setUsernameStatus('idle')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [username])

  const isGmail = (emailAddr: string) => {
    const domain = emailAddr.toLowerCase().trim().split('@')[1]
    return domain === 'gmail.com' || domain === 'googlemail.com'
  }

  const passwordStrength = (() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][passwordStrength]

  // ── Conditional renders (after all hooks) ──

  // Loading state while checking registration settings
  if (regLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Registration disabled
  if (regSettings.status === 'disabled') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', padding: 20
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 420,
          background: '#fff', borderRadius: 24, padding: '40px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>
            Registration Disabled
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
            New registrations are currently not available. Please contact support.
          </p>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 24px', borderRadius: 12, background: '#2563eb', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none'
          }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    )
  }

  // Registration window closed
  if (regSettings.status === 'window_closed') {
    const opensAt = regSettings.regStart ? new Date(regSettings.regStart) : null
    const closedAt = regSettings.regEnd ? new Date(regSettings.regEnd) : null
    const isBefore = opensAt && Date.now() < opensAt.getTime()

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', padding: 20
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 440,
          background: '#fff', borderRadius: 24, padding: '40px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{isBefore ? '⏳' : '🔒'}</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>
            {isBefore ? 'Registration Opens Soon' : 'Registration Closed'}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
            {isBefore
              ? `Registration will open on ${opensAt?.toLocaleString()}`
              : `Registration closed on ${closedAt?.toLocaleString()}`
            }
          </p>
          {isBefore && opensAt && (() => {
            const diff = opensAt.getTime() - Date.now()
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            return (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {[{ l: 'Hours', v: h }, { l: 'Min', v: m }, { l: 'Sec', v: s }].map(({ l, v }) => (
                  <div key={l} style={{
                    textAlign: 'center', background: '#eff6ff', borderRadius: 10,
                    padding: '10px 14px', border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
                      {String(v).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{l}</div>
                  </div>
                ))}
              </div>
            )
          })()}
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 24px', borderRadius: 12, background: '#2563eb', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none'
          }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    )
  }
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !username || !email || !agentEmail || !phone || !country || !city || !password) {
      setError('Please fill in all required fields'); return
    }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (usernameStatus === 'taken') { setError('Username already taken. Please choose another.'); return }
    if (usernameStatus === 'checking') { setError('Please wait — checking username...'); return }
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!agreed) { setError('Please accept the Terms of Service'); return }

    // Step 1: Validate email is Gmail
    setEmailError('')
    setAgentError('')
    if (!isGmail(email)) {
      setEmailError('Only Gmail addresses are accepted. Please enter a valid Gmail address (e.g. yourname@gmail.com).')
      return
    }

    // Step 2: Validate agent email is Gmail
    if (!isGmail(agentEmail)) {
      setAgentError('Only Gmail addresses are accepted. Please ask your agent for their Gmail address.')
      return
    }

    // Step 3: Check if agent exists
    setAgentChecking(true)
    try {
      const result = await authApi.checkAgent(agentEmail)
      if (!result.valid) {
        setAgentError(result.message || 'Agent not found. Please ask your agent for the correct email.')
        setAgentChecking(false)
        return
      }
    } catch (err: any) {
      setAgentError(err.message || 'Failed to verify agent. Please try again.')
      setAgentChecking(false)
      return
    }
    setAgentChecking(false)

    setLoading(true); setError('')
    const normalizedEmail = normalizeEmail(email)
    const result = await sendVerificationEmail(normalizedEmail, `${firstName} ${lastName}`, '', 'verify')
    setLoading(false)

    if (!result.success) { setError(result.error ?? 'Failed to send email'); return }

    setStep('verify')
    setResendTimer(60)
  }

  const otpValue = otpDigits.join('')

  const handleVerify = async () => {
    if (otpValue.length !== 6) return
    await autoVerify(otpValue)
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setOtpDigits(['', '', '', '', '', '']); setOtpStatus('idle')
    const normalizedEmail = normalizeEmail(email)
    await sendVerificationEmail(normalizedEmail, `${firstName} ${lastName}`.trim(), '', 'verify')
    setResendTimer(60)
  }

  const handleOtpChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[index] = val
    setOtpDigits(next)
    setOtpStatus('idle')
    if (val && index < 5) {
      document.getElementById(`reg-otp-${index + 1}`)?.focus()
    }
    // Auto-verify when all 6 digits entered
    const filled = next.join('')
    if (filled.length === 6 && !next.includes('')) {
      setTimeout(() => autoVerify(filled), 150)
    }
  }

  const autoVerify = async (code: string) => {
    setLoading(true)
    const normalizedEmail = normalizeEmail(email)
    const result = await verifyOTPRemote(normalizedEmail, code)
    setOtpStatus(result)

    if (result === 'valid') {
      try {
        await register({ username, email, phone, password, agentEmail, firstName, lastName, country, city })
        // Skip success screen — go directly to complete-profile (no flash, no delay)
        navigate('/complete-profile', { replace: true })
      } catch (e: any) {
        setError(e.message ?? 'Registration failed'); setStep('form')
      }
    }
    setLoading(false)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`reg-otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const digits = pasted.split('')
      setOtpDigits(digits)
      setOtpStatus('idle')
      document.getElementById('reg-otp-5')?.focus()
      // Auto-verify on paste
      setTimeout(() => autoVerify(pasted), 150)
    }
    e.preventDefault()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box', colorScheme: 'light',
  }

  return (
    <div className="auth-page" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#eff6ff 0%,#e0e7ff 100%)', padding: '20px',
      colorScheme: 'light',
    }}>
      <div style={{
        width: '100%', maxWidth: 460, background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)', overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
          padding: '32px 32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BittxLogoIcon size={52} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 21, fontWeight: 900, color: '#fff', margin: 0 }}>
              {step === 'verify' ? 'Verify Email' : step === 'success' ? 'Welcome!' : 'Create Account'}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0' }}>
              {step === 'verify' ? `Code sent to ${email}` : step === 'success' ? 'Account created!' : 'BITTX SMS · Join the platform'}
            </p>
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['form', 'verify', 'success'].map((s, i) => {
              const done = ['form', 'verify', 'success'].indexOf(step) > i
              const active = step === s
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? '#fff' : done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                    color: active ? '#2563eb' : '#fff'
                  }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  {i < 2 && <div style={{ width: 24, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── STEP 1: Form ── */}
        {step === 'form' && (
          <form onSubmit={handleFormSubmit} style={{ padding: '24px 28px 28px' }}>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600
              }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>USERNAME *</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={username}
                  onChange={e => {
                    // Only allow alphanumeric + underscore
                    const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
                    setUsername(v)
                    setError('')
                    setUsernameError('')
                  }}
                  placeholder="e.g. mt_islam (letters, numbers, _)"
                  maxLength={30}
                  style={{
                    ...inp,
                    paddingRight: 40,
                    borderColor: usernameStatus === 'available' ? '#22c55e'
                      : usernameStatus === 'taken' ? '#ef4444'
                      : '#e2e8f0'
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')}
                  onBlur={e => {
                    if (usernameStatus === 'available') e.target.style.borderColor = '#22c55e'
                    else if (usernameStatus === 'taken') e.target.style.borderColor = '#ef4444'
                    else e.target.style.borderColor = '#e2e8f0'
                  }}
                />
                {/* Status icon */}
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  {usernameStatus === 'checking' && (
                    <div style={{ width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  )}
                  {usernameStatus === 'available' && (
                    <Check size={14} style={{ color: '#22c55e' }} />
                  )}
                  {usernameStatus === 'taken' && (
                    <span style={{ fontSize: 14, color: '#ef4444' }}>✕</span>
                  )}
                </div>
              </div>
              {usernameStatus === 'available' && (
                <p style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, margin: '4px 0 0' }}>
                  ✓ Username available
                </p>
              )}
              {usernameError && (
                <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, margin: '4px 0 0' }}>
                  ✕ {usernameError}
                </p>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>FIRST NAME *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter first name" style={inp}
                onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>LAST NAME *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter last name" style={inp}
                onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>EMAIL *</label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setEmailError('') }}
                placeholder="yourname@gmail.com" autoComplete="email"
                style={{
                  ...inp,
                  borderColor: emailError ? '#ef4444' : email && !isGmail(email) ? '#f59e0b' : '#e2e8f0'
                }}
                onFocus={e => (e.target.style.borderColor = '#2563eb')}
                onBlur={e => { if (!emailError) e.target.style.borderColor = '#e2e8f0' }} />
              {emailError && (
                <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginTop: 5, margin: '5px 0 0' }}>
                  ⚠️ {emailError}
                </p>
              )}
              {!emailError && email && !isGmail(email) && (
                <p style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 5, margin: '5px 0 0' }}>
                  ⚠️ Only Gmail addresses are accepted
                </p>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>AGENT EMAIL *</label>
              <input type="email" value={agentEmail}
                onChange={e => { setAgentEmail(e.target.value); setError(''); setAgentError('') }}
                placeholder="agent@gmail.com"
                style={{
                  ...inp,
                  borderColor: agentError ? '#ef4444' : agentEmail && !isGmail(agentEmail) ? '#f59e0b' : '#e2e8f0'
                }}
                onFocus={e => (e.target.style.borderColor = '#2563eb')}
                onBlur={e => { if (!agentError) e.target.style.borderColor = '#e2e8f0' }} />
              {agentChecking && (
                <p style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 12, height: 12, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Checking agent...
                </p>
              )}
              {agentError && !agentChecking && (
                <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: '5px 0 0' }}>
                  ⚠️ {agentError}
                </p>
              )}
              {!agentError && !agentChecking && agentEmail && !isGmail(agentEmail) && (
                <p style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, margin: '5px 0 0' }}>
                  ⚠️ Only Gmail addresses are accepted
                </p>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>PHONE *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880..." style={inp}
                onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>COUNTRY *</label>
              <div style={{ position: 'relative' }}>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  style={{ ...inp, paddingRight: 32, appearance: 'none' as const, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, color: '#94a3b8', pointerEvents: 'none'
                }}>▼</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>CITY *</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Enter city" style={inp}
                onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Min 6 characters" autoComplete="new-password" style={{ ...inp, paddingRight: 42 }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= passwordStrength ? strengthColor : '#e2e8f0'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5
              }}>CONFIRM PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError('') }}
                  placeholder="Repeat password" autoComplete="new-password"
                  style={{
                    ...inp, paddingRight: 42,
                    borderColor: confirmPw && confirmPw !== password ? '#ef4444' : confirmPw && confirmPw === password ? '#22c55e' : '#e2e8f0'
                  }} />
                {confirmPw && confirmPw === password && <Check size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#22c55e'
                }} />}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <div onClick={() => setAgreed(v => !v)} style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `2px solid ${agreed ? '#2563eb' : '#cbd5e1'}`, background: agreed ? '#2563eb' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                {agreed && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                I agree to the <span style={{ color: '#2563eb', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: '#2563eb', fontWeight: 600 }}>Privacy Policy</span>
              </span>
            </label>
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
                color: loading ? '#94a3b8' : '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box'
              }}>
              {loading ? (
                <><div style={{
                  width: 16, height: 16, border: '2.5px solid #94a3b8', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} /> Sending code...</>
              ) : <><UserPlus size={16} /> Create Account</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
              Already have an account? <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
            </p>
          </form>
        )}

        {/* ── STEP 2: OTP Verify ── */}
        {step === 'verify' && (
          <div style={{ padding: '28px 28px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
              }}>
                <Mail size={28} style={{ color: '#2563eb' }} />
              </div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                We sent a <strong>6-digit code</strong> to<br />
                <strong style={{ color: '#2563eb' }}>{email}</strong>
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Expires in {OTP_EXPIRY_MINUTES} minutes</p>
            </div>

            {/* 6-box OTP */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {otpDigits.map((d, i) => (
                <input key={i} id={`reg-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{
                    width: 46, height: 54, textAlign: 'center', fontSize: 24, fontWeight: 800,
                    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                    border: `2px solid ${otpStatus === 'valid' ? '#22c55e' :
                      otpStatus === 'invalid' || otpStatus === 'expired' ? '#ef4444' :
                        d ? '#2563eb' : '#e2e8f0'}`,
                    background: otpStatus === 'valid' ? '#f0fdf4' : otpStatus === 'invalid' || otpStatus === 'expired' ? '#fef2f2' : '#fff',
                    color: '#1e293b', transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </div>

            {otpStatus === 'valid' && (
              <div style={{
                textAlign: 'center', color: '#16a34a', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12
              }}>
                <Check size={18} /> Verified! Creating account...
              </div>
            )}
            {loading && otpStatus === 'idle' && (
              <div style={{
                textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12
              }}>
                <span style={{ width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Verifying...
              </div>
            )}
            {otpStatus === 'invalid' && (
              <p style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                ✕ Incorrect code. Please try again.
              </p>
            )}
            {otpStatus === 'expired' && (
              <p style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                ⏰ Code expired. Request a new one below.
              </p>
            )}

            <button onClick={handleVerify} disabled={otpValue.length < 6 || loading || otpStatus === 'valid'}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 14,
                background: otpValue.length < 6 || loading || otpStatus === 'valid' ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
                color: otpValue.length < 6 || loading || otpStatus === 'valid' ? '#94a3b8' : '#fff',
                border: 'none', cursor: otpValue.length < 6 || loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box'
              }}>
              {loading ? (
                <><div style={{
                  width: 16, height: 16, border: '2.5px solid #94a3b8',
                  borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} /> Verifying...</>
              ) : <><ShieldCheck size={16} /> Verify & Create Account</>}
            </button>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                Didn't get the code?{' '}
                {resendTimer > 0
                  ? <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Resend in {resendTimer}s</span>
                  : <button onClick={handleResend} type="button"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb',
                      fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                    <RefreshCw size={12} /> Resend Code
                  </button>
                }
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 'success' && (
          <div style={{ padding: '28px 28px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Check size={32} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>Account Created!</h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              Welcome to <strong>BITTX SMS</strong>, {firstName}!<br />
              Please complete your profile to activate your account.
            </p>

            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12,
              padding: '14px 18px', marginBottom: 20, textAlign: 'left'
            }}>
              <p style={{ fontSize: 13, color: '#92400e', fontWeight: 700, margin: '0 0 6px' }}>
                ⏳ Please Contact Your Agent
              </p>
              <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                Your account requires activation. Please contact your agent to complete the process.
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', textAlign: 'left', marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                color: '#94a3b8', margin: '0 0 12px'
              }}>AGENT INFORMATION</p>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>Email</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{agentEmail}</p>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 20, height: 20, border: '2.5px solid #16a34a',
                borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
