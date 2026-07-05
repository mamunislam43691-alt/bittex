import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { sendVerificationEmail, verifyOTPRemote } from '../lib/emailService'
import { normalizeEmail, api } from '../lib/api'
import { BittxLogoIcon } from '../components/BittxLogo'

interface LoginPageProps {
  panel: 'admin' | 'agent' | 'user'
}

const PANEL_CONFIG = {
  admin: {
    title: 'Admin Panel',
    subtitle: 'BITTX SMS · Admin Access',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
    icon: '🛡️',
    registerLink: null,
  },
  agent: {
    title: 'Agent Panel',
    subtitle: 'BITTX SMS · Agent Access',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
    icon: '🤝',
    registerLink: null,
  },
  user: {
    title: 'User Login',
    subtitle: 'BITTX SMS · Welcome back',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
    icon: '👤',
    registerLink: '/register',
  },
}

export default function LoginPage({ panel }: LoginPageProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const cfg = PANEL_CONFIG[panel]

  // Force light mode on auth pages — these are always light
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  // Fetch maintenance status on mount
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const settings = await api.get('/settings')
        if (settings.platform?.maintenanceMode) {
          setMaintenanceMode(true)
          setMaintenanceMessage(settings.maintenance?.message || 'System is under maintenance. Please try again later.')
        }
      } catch (err) {
        // Silently fail
      }
    }
    checkMaintenance()
  }, [])

  // 2-step state
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [loggedUser, setLoggedUser] = useState<any>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpStatus, setOtpStatus] = useState<'idle' | 'invalid' | 'expired'>('idle')
  const [resendT, setResendT] = useState(0)
  const [devMode, setDevMode] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const user = await login(email, password, panel, rememberMe)

      // Check if 2-step login is enabled for this user (from DB)
      if ((user as any).twoFALogin) {
        // 2-step enabled — send OTP and show OTP step
        setLoggedUser(user)
        const normalizedEmail = normalizeEmail(user.email)
        const r = await sendVerificationEmail(normalizedEmail, user.firstName || '', '', 'verify')
        const local = sessionStorage.getItem(`otp_${normalizedEmail}`)
        if (local) setDevMode(true)
        setStep('otp')
        setResendT(60)
        const t = setInterval(() => setResendT(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 }), 1000)
      } else {
        // Normal login
        if (['admin', 'superadmin', 'moderator', 'support'].includes(user.role)) navigate('/admin', { replace: true })
        else if (user.role === 'agent') navigate('/agent', { replace: true })
        else if (user.profileComplete === false) navigate('/complete-profile', { replace: true })  // Incomplete profile → straight to complete-profile, no flash
        else navigate('/dashboard', { replace: true })
      }
    } catch (e: any) {
      setError(e.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const otpValue = otpDigits.join('')

  const handleOtpVerify = async () => {
    if (otpValue.length !== 6 || !loggedUser) return
    setOtpLoading(true)
    const r = await verifyOTPRemote(loggedUser.email, otpValue)
    if (r === 'valid') {
      if (['admin', 'superadmin', 'moderator', 'support'].includes(loggedUser.role)) navigate('/admin', { replace: true })
      else if (loggedUser.role === 'agent') navigate('/agent', { replace: true })
      else if (loggedUser.profileComplete === false) navigate('/complete-profile', { replace: true })
      else navigate('/dashboard', { replace: true })
    } else {
      setOtpStatus(r === 'expired' ? 'expired' : 'invalid')
    }
    setOtpLoading(false)
  }

  const handleOtpChange = (i: number, v: string) => {
    const val = v.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]; next[i] = val; setOtpDigits(next); setOtpStatus('idle')
    if (val && i < 5) document.getElementById(`login-otp-${i + 1}`)?.focus()
  }

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) document.getElementById(`login-otp-${i - 1}`)?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtpDigits(p.split('')); setOtpStatus('idle') }
    e.preventDefault()
  }

  const handleResend = async () => {
    if (!loggedUser || resendT > 0) return
    setOtpDigits(['', '', '', '', '', '']); setOtpStatus('idle')
    const normalizedEmail = normalizeEmail(loggedUser.email)
    await sendVerificationEmail(normalizedEmail, loggedUser.firstName, '', 'verify')
    const local = sessionStorage.getItem(`otp_${normalizedEmail}`)
    if (local) setDevMode(true)
    setResendT(60)
    const t = setInterval(() => setResendT(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 }), 1000)
  }

  // Full-page maintenance screen
  if (maintenanceMode && panel !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff5f5', padding: '20px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 520 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#fce7f3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 900, color: '#dc2626', margin: '0 0 12px',
            letterSpacing: '-0.5px',
          }}>
            Under Maintenance
          </h1>
          <p style={{
            fontSize: 16, color: '#64748b', lineHeight: 1.7, margin: '0 0 24px',
          }}>
            {maintenanceMessage || 'We are performing scheduled maintenance. We\'ll be back shortly.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.4s infinite ease-in-out' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.4s infinite ease-in-out 0.2s' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.4s infinite ease-in-out 0.4s' }} />
          </div>
          <div style={{
            background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
            padding: '16px 24px', display: 'inline-block',
          }}>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Need help? Contact us on Telegram: <a href="https://t.me/bittxsmssupport" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>@bittxsmssupport</a>
            </p>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 24 }}>
            BITTX SMS · Real-Time OTP Platform
          </p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="auth-page" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      padding: '20px', colorScheme: 'light',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: cfg.gradient, padding: '36px 32px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          {/* Logo */}
          <BittxLogoIcon size={56} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
              {cfg.title}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '4px 0 0' }}>
              {cfg.subtitle}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '10px 14px', marginBottom: 18, fontSize: 13,
              color: '#dc2626', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          {step === 'credentials' && (<>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6
              }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="Enter your email"
                autoComplete="email"
                style={{
                  width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
                  border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#1e293b',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                  colorScheme: 'light',
                }}
                onFocus={e => (e.target.style.borderColor = cfg.color)}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#94a3b8'
                }}>
                  PASSWORD
                </label>
                {panel === 'user' && (
                  <Link to="/forgot-password" style={{ fontSize: 11, color: cfg.color, fontWeight: 600, textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  style={{
                    width: '100%', padding: '11px 42px 11px 14px', fontSize: 14, borderRadius: 10,
                    border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#1e293b',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                    colorScheme: 'light',
                  }}
                  onFocus={e => (e.target.style.borderColor = cfg.color)}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => setRememberMe(v => !v)}
                  style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${rememberMe ? cfg.color : '#cbd5e1'}`,
                    background: rememberMe ? cfg.color : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: rememberMe ? '#475569' : '#94a3b8', fontWeight: rememberMe ? 600 : 400, transition: 'color 0.15s' }}>
                  Remember me <span style={{ fontSize: 11, color: '#cbd5e1' }}>(24 hours)</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: loading ? '#e2e8f0' : cfg.gradient,
                color: loading ? '#94a3b8' : '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s', boxSizing: 'border-box',
              }}>
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: '2.5px solid #94a3b8',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </>)}

          {/* ── 2-Step OTP ── */}
          {step === 'otp' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: `${cfg.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                }}>
                  <ShieldCheck size={26} style={{ color: cfg.color }} />
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                  2-Step Verification<br />
                  Code sent to <strong style={{ color: cfg.color }}>{loggedUser?.email}</strong>
                </p>
              </div>

              {devMode && (
                <div style={{
                  background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8,
                  padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e'
                }}>
                  🛠 Dev Mode — Use code: <code style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.2em' }}>123456</code>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
                {otpDigits.map((d, i) => (
                  <input key={i} id={`login-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)} onPaste={i === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800,
                      borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                      border: `2px solid ${otpStatus === 'invalid' || otpStatus === 'expired' ? '#ef4444' : d ? cfg.color : '#e2e8f0'}`,
                      background: otpStatus === 'invalid' ? '#fef2f2' : '#fff', color: '#1e293b'
                    }} />
                ))}
              </div>

              {otpStatus === 'invalid' && <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>✕ Incorrect code</p>}
              {otpStatus === 'expired' && <p style={{ textAlign: 'center', color: '#f59e0b', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⏰ Code expired</p>}

              <button type="button" onClick={handleOtpVerify} disabled={otpValue.length < 6 || otpLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 12,
                  background: otpValue.length < 6 || otpLoading ? '#e2e8f0' : cfg.gradient,
                  color: otpValue.length < 6 || otpLoading ? '#94a3b8' : '#fff', border: 'none',
                  cursor: otpValue.length < 6 || otpLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box'
                }}>
                {otpLoading
                  ? <><div style={{ width: 15, height: 15, border: '2.5px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Verifying...</>
                  : <><ShieldCheck size={15} /> Verify & Login</>}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => { setStep('credentials'); setOtpDigits(['', '', '', '', '', '']) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                  ← Back
                </button>
                {resendT > 0
                  ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Resend in {resendT}s</span>
                  : <button type="button" onClick={handleResend}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: cfg.color,
                      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                    <RefreshCw size={11} /> Resend
                  </button>
                }
              </div>
            </div>
          )}

          {/* Register link for user panel */}
          {cfg.registerLink && step === 'credentials' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 18 }}>
              Don't have an account?{' '}
              <Link to={cfg.registerLink} style={{ color: cfg.color, fontWeight: 700, textDecoration: 'none' }}>
                Create Account
              </Link>
            </p>
          )}

          {/* Panel switch links — only show on Admin/Agent panels, not User */}
          {panel !== 'user' && step === 'credentials' && (
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16,
              paddingTop: 16, borderTop: '1px solid #f1f5f9'
            }}>
              {panel === 'admin' && (
                <Link to="/login" style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none', fontWeight: 600 }}>
                  ← User Panel
                </Link>
              )}
              {panel === 'agent' && (
                <Link to="/login" style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none', fontWeight: 600 }}>
                  ← User Panel
                </Link>
              )}
            </div>
          )}
        </form>

      </div>
    </div>
  )
}