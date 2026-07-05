import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Phone, MapPin, User, Globe, Mail } from 'lucide-react'
import { useAuth, readAnySession, writeSession } from '../context/AuthContext'
import { COUNTRIES } from '../lib/countries'
import { profileApi, authApi } from '../lib/api'

function TelegramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}

export default function CompleteProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Pre-filled from registration
  const username = user?.username || ''
  const email = user?.email || ''
  const phone = user?.phone || ''
  const country = user?.country || ''
  const existingAgentEmail = user?.agentEmail || ''

  // Required fields to complete
  const [birthDate, setBirthDate] = useState('')
  const [timezone, setTimezone] = useState('UTC+0')
  const [address, setAddress] = useState('')
  const [telegram, setTelegram] = useState('')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successScreen, setSuccessScreen] = useState(false)
  const [agentTelegram, setAgentTelegram] = useState('')

  const timezones = [
    'UTC+0', 'UTC-5 (EST)', 'UTC-8 (PST)', 'UTC+1 (CET)', 'UTC+3 (MSK)',
    'UTC+5:30 (IST)', 'UTC+6 (BST)', 'UTC+8 (CST)', 'UTC+9 (JST)', 'UTC+10 (AEST)',
  ]

  const validate = () => {
    const e: Record<string, string> = {}
    if (!birthDate.trim()) e.birthDate = 'Birth date is required'
    if (!telegram.trim()) e.telegram = 'Telegram username is required'
    return e
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)

    // Save profile info using API (DO NOT change status — keep current status)
    try {
      await profileApi.update({
        birthDate,
        timezone,
        address,
        telegram,
        profileComplete: true,
      })

      // Update session in localStorage
      const session = readAnySession()
      session.profileComplete = true
      session.birthDate = birthDate
      session.timezone = timezone
      session.address = address
      session.telegram = telegram
      writeSession(session)
    } catch (err: any) {
      console.error('Profile update failed:', err)
    }

    setLoading(false)
    // Show success screen with agent info before navigating
    setSuccessScreen(true)
    // Fetch agent's telegram
    if (existingAgentEmail) {
      try {
        const result = await authApi.checkAgent(existingAgentEmail)
        if (result.telegram) setAgentTelegram(result.telegram)
      } catch {}
    }
  }

  // Check if all fields filled
  const allFilled = birthDate.trim() && telegram.trim()

  const inp = (hasErr: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
    border: `1.5px solid ${hasErr ? '#ef4444' : '#e2e8f0'}`,
    background: hasErr ? '#fef2f2' : '#f8fafc',
    color: '#1e293b', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  const readInp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#f1f5f9',
    color: '#94a3b8', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed',
  }

  const lbl = (required = true): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
    color: '#94a3b8', display: 'block', marginBottom: 5,
  })

  const selectedCountry = COUNTRIES.find(c => c.name === country)

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #eff6ff 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #14532d, #16a34a)',
          padding: '28px 32px 22px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
              Complete Your Profile
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>
              A few more details to get you started 🎉
            </p>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Profile completion</span>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                {[birthDate, telegram].filter(Boolean).length * 50}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }}>
              <div style={{
                height: '100%', borderRadius: 3, background: '#fff',
                width: `${[birthDate, telegram].filter(Boolean).length * 50}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>

          {/* Pre-filled info notice */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
            padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#15803d',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Check size={14} /> Account created as <strong>{username}</strong> · {email}
          </div>

          {/* Auto-filled fields (readonly) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl()}>USERNAME</label>
              <input value={username} readOnly style={readInp} />
            </div>
            <div>
              <label style={lbl()}>EMAIL</label>
              <input value={email} readOnly style={readInp} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl()}>PHONE</label>
              <input value={phone} readOnly style={readInp} />
            </div>
            <div>
              <label style={lbl()}>COUNTRY</label>
              <input value={selectedCountry ? `${selectedCountry.flag} ${country}` : country} readOnly style={readInp} />
            </div>
          </div>

          <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0 16px' }} />
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: 600 }}>
            ✳️ Required fields — please complete all to access your account
          </p>

          {/* Date of Birth */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>DATE OF BIRTH *</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => { setBirthDate(e.target.value); setErrors(p => ({ ...p, birthDate: '' })) }}
              style={inp(!!errors.birthDate)}
              onFocus={e => { if (!errors.birthDate) e.target.style.borderColor = '#16a34a' }}
              onBlur={e => { if (!errors.birthDate) e.target.style.borderColor = '#e2e8f0' }}
            />
            {errors.birthDate && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0', fontWeight: 600 }}>{errors.birthDate}</p>}
          </div>

          {/* Timezone */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl(false)}>TIMEZONE</label>
            <div style={{ position: 'relative' }}>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}
                style={{ ...inp(false), paddingRight: 28, appearance: 'none', cursor: 'pointer' }}
                onFocus={e => (e.target.style.borderColor = '#16a34a')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}>
                {timezones.map(t => <option key={t}>{t}</option>)}
              </select>
              <Globe size={12} style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none'
              }} />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl(false)}>ADDRESS</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Your full address..."
              rows={2}
              style={{
                ...inp(false),
                resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#16a34a'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Telegram */}
          <div style={{ marginBottom: 22 }}>
            <label style={lbl()}>TELEGRAM USERNAME *</label>
            <div style={{ display: 'flex' }}>
              <span style={{
                padding: '11px 12px', fontSize: 14, background: '#f1f5f9',
                border: `1.5px solid ${errors.telegram ? '#ef4444' : '#e2e8f0'}`,
                borderRight: 'none', borderRadius: '10px 0 0 10px',
                color: '#94a3b8', flexShrink: 0
              }}>@</span>
              <input
                value={telegram}
                onChange={e => { setTelegram(e.target.value.replace('@', '')); setErrors(p => ({ ...p, telegram: '' })) }}
                placeholder="username"
                style={{ ...inp(!!errors.telegram), borderRadius: '0 10px 10px 0', borderLeft: 'none' }}
                onFocus={e => { if (!errors.telegram) e.target.style.borderColor = '#16a34a' }}
                onBlur={e => { if (!errors.telegram) e.target.style.borderColor = '#e2e8f0' }}
              />
            </div>
            {errors.telegram && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0', fontWeight: 600 }}>{errors.telegram}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!allFilled || loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: !allFilled || loading
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #14532d, #16a34a)',
              color: !allFilled || loading ? '#94a3b8' : '#fff',
              border: 'none', cursor: !allFilled || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxSizing: 'border-box', transition: 'all 0.2s',
            }}>
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16, border: '2.5px solid #94a3b8',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Saving...
              </>
            ) : (
              <><Check size={16} /> Complete Profile</>
            )}
          </button>

          {!allFilled && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
              ⚠ Fill all required fields to continue
            </p>
          )}
        </form>
      </div>

      {/* Success Screen with Agent Contact Info */}
      {successScreen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #14532d, #16a34a)',
              padding: '28px 32px 22px', textAlign: 'center'
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <Check size={32} color="#fff" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                Profile Completed!
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                Your account is pending activation
              </p>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <div style={{
                background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12,
                padding: '16px 18px', marginBottom: 20
              }}>
                <p style={{ fontSize: 13, color: '#92400e', fontWeight: 700, margin: '0 0 8px' }}>
                  ⏳ Please Contact Your Agent
                </p>
                <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, margin: 0 }}>
                  Your account is pending activation. Please contact your agent to complete the activation process.
                </p>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: '#94a3b8', margin: '0 0 12px'
                }}>AGENT INFORMATION</p>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>Email</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{existingAgentEmail}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>Telegram</p>
                  {agentTelegram ? (
                    <a
                      href={`https://t.me/${agentTelegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        background: '#229ED9', color: '#fff', textDecoration: 'none',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#1A8BC8'}
                      onMouseOut={e => e.currentTarget.style.background = '#229ED9'}
                    >
                      <TelegramIcon size={16} /> Contact on Telegram
                    </a>
                  ) : (
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{existingAgentEmail}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate('/login', { replace: true })}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: 'linear-gradient(135deg, #14532d, #16a34a)', color: '#fff',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8
                }}
              >
                Continue to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
