import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Zap, Check, Eye, EyeOff, RefreshCw, ShieldCheck, KeyRound } from 'lucide-react'
import { sendVerificationEmail, verifyOTPRemote } from '../lib/emailService'

type Step = 'email' | 'verify' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // Force light mode on auth pages
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const [step,        setStep]        = useState<Step>('email')
  const [email,       setEmail]       = useState('')
  const [otpDigits,   setOtpDigits]   = useState<string[]>(['','','','','',''])
  const [otpStatus,   setOtpStatus]   = useState<'idle'|'valid'|'invalid'|'expired'>('idle')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [devMode,     setDevMode]     = useState(false)

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setInterval(() => setResendTimer(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendTimer])

  const passwordStrength = (() => {
    if (!newPassword) return 0
    let s = 0
    if (newPassword.length >= 8) s++
    if (/[A-Z]/.test(newPassword)) s++
    if (/[0-9]/.test(newPassword)) s++
    if (/[^A-Za-z0-9]/.test(newPassword)) s++
    return s
  })()
  const strengthColor = ['','#ef4444','#f59e0b','#3b82f6','#22c55e'][passwordStrength]
  const strengthLabel = ['','Weak','Fair','Good','Strong'][passwordStrength]

  /* Step 1: Send OTP */
  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email'); return }
    setLoading(true); setError('')

    // Check if user exists via API
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const checkRes = await fetch(`${BASE}/email/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!checkRes.ok) {
        const data = await checkRes.json()
        setLoading(false)
        setError(data.message || 'No account found with this email address')
        return
      }
    } catch {
      // If check endpoint doesn't exist, proceed anyway — server will validate during OTP
    }

    const result = await sendVerificationEmail(email, 'User', '', 'reset')
    setLoading(false)

    if (!result.success) { setError(result.error ?? 'Failed to send email'); return }

    const local = sessionStorage.getItem(`otp_${email}`)
    if (local) setDevMode(true)

    setStep('verify')
    setResendTimer(60)
  }

  /* Step 2: Verify OTP */
  const otpValue = otpDigits.join('')

  const handleVerify = async () => {
    if (otpValue.length !== 6) return
    setLoading(true)
    const result = await verifyOTPRemote(email, otpValue)
    setOtpStatus(result === 'valid' ? 'valid' : result === 'expired' ? 'expired' : 'invalid')
    if (result === 'valid') {
      setTimeout(() => setStep('reset'), 600)
    }
    setLoading(false)
  }

  const handleOtpChange = (i: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]; next[i] = val
    setOtpDigits(next); setOtpStatus('idle')
    if (val && i < 5) document.getElementById(`fp-otp-${i + 1}`)?.focus()
  }

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      document.getElementById(`fp-otp-${i - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtpDigits(pasted.split('')); setOtpStatus('idle') }
    e.preventDefault()
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setOtpDigits(['','','','','','']); setOtpStatus('idle')
    await sendVerificationEmail(email, 'User', '', 'reset')
    const local = sessionStorage.getItem(`otp_${email}`)
    if (local) setDevMode(true)
    setResendTimer(60)
  }

  /* Step 3: Set new password */
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPw) { setError('Passwords do not match'); return }

    setLoading(true); setError('')

    // Update password via API
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${BASE}/email/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to reset password')
        setLoading(false)
        return
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    setStep('done')
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box',
  }

  const stepTitles: Record<Step, string> = {
    email: 'Forgot Password',
    verify: 'Verify Email',
    reset: 'New Password',
    done: 'Password Reset!',
  }

  return (
    <div className="auth-page" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      colorScheme: 'light',
      background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:24,
        boxShadow:'0 24px 64px rgba(0,0,0,0.12)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#14532d,#16a34a)',
          padding:'28px 32px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={24} color="#fff" strokeWidth={2.5}/>
          </div>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', margin:0 }}>{stepTitles[step]}</h1>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.75)', margin:'3px 0 0' }}>BITTX SMS · Account Recovery</p>
          </div>
          {/* Step dots */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {(['email','verify','reset','done'] as Step[]).map((s, i) => {
              const steps = ['email','verify','reset','done']
              const done = steps.indexOf(step) > i
              const active = step === s
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', fontSize:10, fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: active?'#fff':done?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)',
                    color: active?'#16a34a':'#fff' }}>
                    {done ? <Check size={10}/> : i+1}
                  </div>
                  {i < 3 && <div style={{ width:16, height:2, background:'rgba(255,255,255,0.3)', borderRadius:1 }}/>}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── STEP 1: Enter email ── */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} style={{ padding:'24px 28px 28px' }}>
            <p style={{ fontSize:14, color:'#475569', lineHeight:1.6, marginBottom:20 }}>
              Enter your account email address. We'll send a verification code to reset your password.
            </p>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
                padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const,
                letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:5 }}>EMAIL ADDRESS</label>
              <div style={{ position:'relative' }}>
                <Mail size={14} style={{ position:'absolute', left:12, top:'50%',
                  transform:'translateY(-50%)', color:'#94a3b8' }}/>
                <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('')}}
                  placeholder="your@email.com" autoComplete="email"
                  style={{ ...inp, paddingLeft:36 }}
                  onFocus={e=>(e.target.style.borderColor='#16a34a')}
                  onBlur={e=>(e.target.style.borderColor='#e2e8f0')}/>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:12, fontSize:14, fontWeight:700,
                background: loading?'#e2e8f0':'linear-gradient(135deg,#14532d,#16a34a)',
                color: loading?'#94a3b8':'#fff', border:'none', cursor:loading?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxSizing:'border-box' }}>
              {loading ? (
                <><div style={{ width:16, height:16, border:'2.5px solid #94a3b8', borderTopColor:'transparent',
                  borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Sending code...</>
              ) : <><Mail size={16}/> Send Reset Code</>}
            </button>
            <p style={{ textAlign:'center', fontSize:13, color:'#94a3b8', marginTop:16 }}>
              Remember your password? <Link to="/login" style={{ color:'#16a34a', fontWeight:700, textDecoration:'none' }}>Sign In</Link>
            </p>
          </form>
        )}

        {/* ── STEP 2: Verify OTP ── */}
        {step === 'verify' && (
          <div style={{ padding:'24px 28px 28px' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <p style={{ fontSize:14, color:'#374151', lineHeight:1.6, margin:0 }}>
                Enter the 6-digit code sent to<br/>
                <strong style={{ color:'#16a34a' }}>{email}</strong>
              </p>
            </div>

            {devMode && (
              <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10,
                padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e' }}>
                <strong>🛠 Dev Mode</strong> — Use code: <code style={{ fontSize:16, fontWeight:900, letterSpacing:'0.2em' }}>123456</code>
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }}>
              {otpDigits.map((d, i) => (
                <input key={i} id={`fp-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{
                    width:44, height:52, textAlign:'center', fontSize:22, fontWeight:800,
                    borderRadius:10, outline:'none', boxSizing:'border-box',
                    border: `2px solid ${otpStatus==='valid'?'#22c55e':otpStatus==='invalid'||otpStatus==='expired'?'#ef4444':d?'#16a34a':'#e2e8f0'}`,
                    background: otpStatus==='valid'?'#f0fdf4':otpStatus==='invalid'?'#fef2f2':'#fff',
                    color:'#1e293b',
                  }}
                />
              ))}
            </div>

            {otpStatus === 'invalid' && <p style={{ textAlign:'center', color:'#dc2626', fontSize:12, fontWeight:700, marginBottom:8 }}>✕ Incorrect code</p>}
            {otpStatus === 'expired' && <p style={{ textAlign:'center', color:'#f59e0b', fontSize:12, fontWeight:700, marginBottom:8 }}>⏰ Code expired — request a new one</p>}

            <button onClick={handleVerify} disabled={otpValue.length<6||loading}
              style={{ width:'100%', padding:'11px', borderRadius:12, fontSize:14, fontWeight:700, marginBottom:12,
                background: otpValue.length<6||loading?'#e2e8f0':'linear-gradient(135deg,#14532d,#16a34a)',
                color: otpValue.length<6||loading?'#94a3b8':'#fff', border:'none',
                cursor:otpValue.length<6||loading?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxSizing:'border-box' }}>
              {loading ? <><div style={{ width:15, height:15, border:'2.5px solid #94a3b8', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Verifying...</> : <><ShieldCheck size={15}/> Verify Code</>}
            </button>

            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:12, color:'#94a3b8' }}>
                {resendTimer > 0
                  ? <span style={{ color:'#cbd5e1' }}>Resend in {resendTimer}s</span>
                  : <button onClick={handleResend} style={{ background:'none', border:'none', cursor:'pointer',
                      color:'#16a34a', fontWeight:700, fontSize:12, display:'inline-flex', alignItems:'center', gap:4 }}>
                      <RefreshCw size={11}/> Resend Code
                    </button>
                }
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: New password ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ padding:'24px 28px 28px' }}>
            <p style={{ fontSize:14, color:'#475569', lineHeight:1.6, marginBottom:20 }}>
              Create a new strong password for your account.
            </p>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
                padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const,
                letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:5 }}>NEW PASSWORD</label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} value={newPassword} onChange={e=>{setNewPassword(e.target.value);setError('')}}
                  placeholder="Min 6 characters" autoComplete="new-password"
                  style={{ ...inp, paddingRight:42 }}
                  onFocus={e=>(e.target.style.borderColor='#16a34a')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {newPassword && (
                <div style={{ marginTop:5 }}>
                  <div style={{ display:'flex', gap:3, marginBottom:3 }}>
                    {[1,2,3,4].map(i=>(
                      <div key={i} style={{ flex:1, height:3, borderRadius:2,
                        background: i<=passwordStrength ? strengthColor : '#e2e8f0' }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:10, color:strengthColor, fontWeight:700 }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const,
                letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:5 }}>CONFIRM PASSWORD</label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} value={confirmPw} onChange={e=>{setConfirmPw(e.target.value);setError('')}}
                  placeholder="Repeat new password" autoComplete="new-password"
                  style={{ ...inp, paddingRight:42, borderColor: confirmPw&&confirmPw!==newPassword?'#ef4444':confirmPw&&confirmPw===newPassword?'#22c55e':'#e2e8f0' }}/>
                {confirmPw&&confirmPw===newPassword&&<Check size={14} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#22c55e' }}/>}
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:12, fontSize:14, fontWeight:700,
                background: loading?'#e2e8f0':'linear-gradient(135deg,#14532d,#16a34a)',
                color: loading?'#94a3b8':'#fff', border:'none', cursor:loading?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxSizing:'border-box' }}>
              {loading ? <><div style={{ width:15,height:15,border:'2.5px solid #94a3b8',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> Saving...</> : <><KeyRound size={15}/> Reset Password</>}
            </button>
          </form>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div style={{ padding:'32px 28px', textAlign:'center' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'#dcfce7',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Check size={32} style={{ color:'#16a34a' }}/>
            </div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#1e293b', margin:'0 0 8px' }}>Password Updated!</h2>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6 }}>
              Your password has been reset successfully.<br/>Redirecting to login...
            </p>
            <div style={{ marginTop:16, display:'flex', justifyContent:'center' }}>
              <div style={{ width:20, height:20, border:'2.5px solid #16a34a',
                borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
