import { useState } from 'react'
import { X, Save, User, Mail, Phone, MapPin, Lock, UserPlus } from 'lucide-react'

const countries = ['Bangladesh', 'Pakistan', 'India', 'USA', 'UK', 'Germany', 'France', 'Russia', 'Brazil', 'Other']
const timezones = ['UTC+0', 'UTC+5:30 (IST)', 'UTC+6 (BST)', 'UTC-5 (EST)', 'UTC-8 (PST)', 'UTC+1 (CET)', 'UTC+3 (MSK)', 'UTC+8 (CST)']

interface AddUserModalProps {
  onClose: () => void
  onAdd: (user: {
    username: string; email: string; phone: string; password?: string;
    firstName?: string; lastName?: string; country?: string; city?: string;
    telegram?: string; bio?: string; birthDate?: string; timezone?: string; address?: string;
    commission?: string
  }) => void
  mode?: 'user' | 'agent'
}

export default function AddUserModal({ onClose, onAdd, mode = 'user' }: AddUserModalProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    country: 'Bangladesh',
    city: '',
    birthDate: '',
    timezone: 'UTC+0',
    address: '',
    telegram: '',
    bio: '',
    commission: '10',  // agent only
  })
  const [saved, setSaved] = useState(false)
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5,
  }

  const handleAdd = () => {
    if (!form.firstName || !form.email) return
    onAdd({
      username: `${form.firstName}${form.lastName ? '_' + form.lastName : ''}`,
      email: form.email,
      phone: form.phone,
      password: form.password || 'default123',
      firstName: form.firstName,
      lastName: form.lastName,
      country: form.country,
      city: form.city,
      telegram: form.telegram,
      bio: form.bio,
      birthDate: form.birthDate,
      timezone: form.timezone,
      address: form.address,
      commission: form.commission,
    })
    setSaved(true); setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: 640, maxWidth: '96vw',
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg,#7c3aed08,#6366f108)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {mode === 'agent' ? 'Create New Agent' : 'Add New User'}
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                Fill in personal information
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Personal Info section */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#7c3aed', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <User size={12} /> Personal Information
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>FIRST NAME *</label>
                <input value={form.firstName} onChange={e => up('firstName', e.target.value)} placeholder="e.g. Islam" style={inp} /></div>
              <div><label style={lbl}>LAST NAME</label>
                <input value={form.lastName} onChange={e => up('lastName', e.target.value)} placeholder="e.g. Mamun" style={inp} /></div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>BIO</label>
                <textarea value={form.bio} onChange={e => up('bio', e.target.value)} rows={2}
                  placeholder="Tell us about yourself..." style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div><label style={lbl}>COUNTRY</label>
                <select value={form.country} onChange={e => up('country', e.target.value)} style={inp}>
                  {countries.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label style={lbl}>CITY</label>
                <input value={form.city} onChange={e => up('city', e.target.value)} placeholder="e.g. Dhaka" style={inp} /></div>
              <div><label style={lbl}>BIRTH DATE</label>
                <input type="date" value={form.birthDate} onChange={e => up('birthDate', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>TIMEZONE</label>
                <select value={form.timezone} onChange={e => up('timezone', e.target.value)} style={inp}>
                  {timezones.map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>ADDRESS</label>
                <textarea value={form.address} onChange={e => up('address', e.target.value)} rows={2}
                  placeholder="Full address..." style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div><label style={lbl}>TELEGRAM USERNAME</label>
                <div style={{ display: 'flex' }}>
                  <span style={{ padding: '9px 10px', fontSize: 14, background: '#e2e8f0', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#64748b' }}>@</span>
                  <input value={form.telegram} onChange={e => up('telegram', e.target.value)} placeholder="username"
                    style={{ ...inp, borderRadius: '0 8px 8px 0', flex: 1 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact section */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#0ea5e9', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Mail size={12} /> Contact & Login
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>EMAIL *</label>
                <input value={form.email} onChange={e => up('email', e.target.value)} placeholder="user@example.com" style={inp} /></div>
              <div><label style={lbl}>PHONE (READ-ONLY after save)</label>
                <input value={form.phone} onChange={e => up('phone', e.target.value)} placeholder="+8801..." style={inp} /></div>
              <div><label style={lbl}>PASSWORD</label>
                <input type="password" value={form.password} onChange={e => up('password', e.target.value)} placeholder="Set password..." style={inp} /></div>
              {mode === 'agent' && (
                <div><label style={lbl}>COMMISSION %</label>
                  <input type="number" value={form.commission} onChange={e => up('commission', e.target.value)} min="0" max="50" style={inp} /></div>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer'
              }}>
              Cancel
            </button>
            <button onClick={handleAdd}
              style={{
                flex: 2, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                background: saved ? '#22c55e' : '#7c3aed', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
              <UserPlus size={14} /> {saved ? '✓ Added!' : (mode === 'agent' ? 'Create Agent' : 'Add User')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
