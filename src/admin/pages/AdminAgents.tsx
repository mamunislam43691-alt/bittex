import { useState, useEffect } from 'react'
import { Plus, Eye, EyeOff, Edit2, X, Save, Users, Ban, DollarSign, Zap, ZapOff, Check, Copy, AlertTriangle, UserX, ArrowRightLeft, Trash2, RefreshCw } from 'lucide-react'
import { Agent, User } from '../data/types'
import AddUserModal from '../components/AddUserModal'
import OTPTargetSection, { OTPTarget } from '../components/OTPTargetSection'
import { adminApi, api } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

/* ── Helper to remove BD prefix from display ── */
function cleanAgentName(username: string): string {
  return username.replace(/^BD_/i, '').replace(/_BD_/gi, '_')
}

/* ── Copy helper ── */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>{value || '—'}</span>
        {value && (
          <button onClick={copy} style={{
            flexShrink: 0, background: copied ? '#dcfce7' : '#f1f5f9', border: 'none', borderRadius: 6,
            padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: copied ? '#16a34a' : '#475569',
            display: 'flex', alignItems: 'center', gap: 3
          }}>
            {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Agent View Modal (info only) ── */
function AgentViewModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [localUsers, setLocalUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [agentData, setAgentData] = useState<any>(agent)
  const totalEarned = localUsers.reduce((s, u) => s + (u.totalEarned || 0), 0)
  const totalOTPs = localUsers.reduce((s, u) => s + (u.otpCount || 0), 0)

  useEffect(() => {
    // Fetch full agent data
    adminApi.agents().then((res: any) => {
      const full = (res.agents || []).find((a: any) => (a._id || a.id) === agent.id)
      if (full) setAgentData(full)
    }).catch(() => {})

    api.get('/users').then((res: any) => {
      const users = (res.users || []).filter((u: any) => u.agentId === agent.id || u.agentEmail === agent.email)
      setLocalUsers(users)
    }).catch(() => {}).finally(() => setLoadingUsers(false))
  }, [agent.id, agent.email])

  const handleBan = (id: string) => setLocalUsers(prev => prev.map(u => ((u as any)._id || u.id) === id ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' } : u))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: 720,
        maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0
            }}>
              {(agent.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{cleanAgentName(agent.username)}</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', fontFamily: 'monospace' }}>{agent.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'Total Users', value: localUsers.length.toString(), color: '#7c3aed' },
              { label: 'Active Users', value: localUsers.filter(u => u.status === 'active').length.toString(), color: '#22c55e' },
              { label: 'Total OTPs', value: totalOTPs.toLocaleString(), color: '#f59e0b' },
              { label: 'Total Revenue', value: `$${totalEarned.toFixed(2)}`, color: '#0ea5e9' },
            ].map(s => (
              <div key={s.label} style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Agent info */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7c3aed', margin: '0 0 12px' }}>Agent Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CopyField label="Username" value={agent.username} />
              <CopyField label="Full Name" value={[agent.firstName, agent.lastName].filter(Boolean).join(' ') || '—'} />
              <CopyField label="Email" value={agent.email} />
              <CopyField label="Phone" value={agent.phone || '—'} />
              <CopyField label="Country" value={agent.country || '—'} />
              <CopyField label="City" value={agent.city || '—'} />
              <CopyField label="Telegram" value={agent.telegram || '—'} />
              <CopyField label="Balance" value={agent.balance != null ? `$${agent.balance.toFixed(2)}` : '$0.00'} />
              <CopyField label="Commission" value={`${agent.commission}%`} />
              <CopyField label="API Access" value={agent.apiEnabled != null ? (agent.apiEnabled ? 'Enabled' : 'Disabled') : '—'} />
              <CopyField label="Status" value={(agent.status || '').toUpperCase()} />
              <CopyField label="Last Login" value={agentData.lastLogin ? new Date(agentData.lastLogin).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'} />
              <CopyField label="Joined" value={agent.joinedAt || ''} />
            </div>
          </div>

          {/* Assigned users */}
          <div>
            <h4 style={{
              fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Users size={14} style={{ color: '#7c3aed' }} /> Assigned Users ({localUsers.length})
            </h4>
            {localUsers.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No users assigned</p>
            ) : (
              <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['User', 'Country', 'Balance', 'Status', 'Last Login'].map(h => (
                        <th key={h} style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: '#94a3b8', padding: '8px 14px', textAlign: 'left',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50">
                        <td style={{ padding: '10px 14px', overflow: 'hidden', maxWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</p>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', overflow: 'hidden', maxWidth: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{(u as any).country || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>${(u.balance ?? 0).toFixed(2)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
                            background: u.status === 'active' ? '#dcfce7' : u.status === 'banned' ? '#fee2e2' : u.status === 'pending' ? '#fef9c3' : '#f1f5f9',
                            color: u.status === 'active' ? '#16a34a' : u.status === 'banned' ? '#dc2626' : u.status === 'pending' ? '#b45309' : '#94a3b8'
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {(u as any).lastLogin ? new Date((u as any).lastLogin).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Agent Edit Modal ── */
function AgentEditModal({ agent, onClose, onSave }: { agent: Agent; onClose: () => void; onSave: (a: Agent) => void }) {
  const safeUsername = agent.username || ''
  const [firstName, setFirstName] = useState(agent.firstName || safeUsername.split('_')[0] || safeUsername)
  const [lastName, setLastName] = useState(agent.lastName || safeUsername.split('_').slice(1).join('_') || '')
  const [email, setEmail] = useState(agent.email)
  const [phone, setPhone] = useState(agent.phone || '')
  const [country, setCountry] = useState(agent.country || '')
  const [city, setCity] = useState(agent.city || '')
  const [telegram, setTelegram] = useState(agent.telegram || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [commission, setCommission] = useState((agent.commission ?? 10).toString())
  const [balance, setBalance] = useState(((agent as any).balance || 0).toString())
  const [status, setStatus] = useState(agent.status)
  const [apiEnabled, setApiEnabled] = useState(true)
  const [saved, setSaved] = useState(false)
  // OTP Target for agent
  const [otpTarget, setOtpTarget] = useState<OTPTarget>({ enabled: false, period: 'monthly', limit: 5000, action: 'suspend' })
  // What happens to users when agent is banned
  type UserAction = 'keep_active' | 'suspend_all' | 'transfer'
  const [userAction, setUserAction] = useState<UserAction>('keep_active')
  const [transferTo, setTransferTo] = useState('')
  const [otherAgents, setOtherAgents] = useState<Agent[]>([])

  useEffect(() => {
    adminApi.agents().then((res: any) => {
      const all = (res.agents || []).map((a: any) => ({
        id: a._id || a.id, username: a.username, email: a.email,
        commission: a.commission || 10, usersCount: 0, totalRevenue: 0,
        status: a.status, joinedAt: a.joinedAt || '',
      }))
      setOtherAgents(all.filter((a: Agent) => a.id !== agent.id && a.status === 'active'))
    }).catch(() => {})
  }, [agent.id])

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6
  }

  const handleSave = () => {
    const username = lastName ? `${firstName}_${lastName}` : firstName
    const data: any = { ...agent, username, email, phone, country, city, telegram,
      commission: parseFloat(commission) || agent.commission, balance: parseFloat(balance) || 0, status, firstName, lastName }
    if (password) data.password = password
    onSave(data)
    setSaved(true); setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: 540,
        maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>

        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Agent</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>{agent.username}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>FIRST NAME</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inp} /></div>
            <div><label style={lbl}>LAST NAME</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inp} /></div>
          </div>
          {/* Email */}
          <div><label style={lbl}>EMAIL</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@example.com" style={inp} /></div>
          {/* Phone */}
          <div><label style={lbl}>PHONE</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880..." style={inp} /></div>
          {/* Country + City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>COUNTRY</label>
              <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Bangladesh" style={inp} /></div>
            <div><label style={lbl}>CITY</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Dhaka" style={inp} /></div>
          </div>
          {/* Telegram */}
          <div><label style={lbl}>TELEGRAM</label>
            <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" style={inp} /></div>
          {/* Password */}
          <div><label style={lbl}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                style={{ ...inp, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {/* Commission + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>COMMISSION %</label>
              <input type="number" value={commission} onChange={e => setCommission(e.target.value)} min="0" max="50" style={inp} /></div>
            <div>
              <label style={lbl}>STATUS</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['active', 'inactive'] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                      background: status === s ? (s === 'active' ? '#22c55e' : '#94a3b8') : '#f1f5f9',
                      color: status === s ? '#fff' : '#64748b'
                    }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Balance */}
          <div><label style={lbl}>BALANCE (USD)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} min="0" step="0.01" style={inp} /></div>

          {/* API toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc'
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>API Access</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{apiEnabled ? 'Agent can use API' : 'Disabled'}</p>
            </div>
            <button onClick={() => setApiEnabled(v => !v)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: apiEnabled ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0
              }}>
              <span style={{
                position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                left: apiEnabled ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          {/* OTP Target for agent */}
          <OTPTargetSection value={otpTarget} onChange={setOtpTarget} accentColor="#7c3aed" />

          {/* What happens to users when agent is banned/deactivated */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <UserX size={14} style={{ color: '#ef4444' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>If Agent is Banned / Deactivated</p>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px' }}>Choose what happens to this agent's users:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { key: 'keep_active', icon: '✅', label: 'Keep users active', desc: 'Users remain active without an agent' },
                { key: 'suspend_all', icon: '⏸', label: 'Suspend all users', desc: 'All users get suspended automatically' },
                { key: 'transfer', icon: '↗️', label: 'Transfer to another agent', desc: 'Move all users to a different agent' },
              ] as { key: UserAction, icon: string, label: string, desc: string }[]).map(opt => (
                <div key={opt.key} onClick={() => setUserAction(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 9, cursor: 'pointer', transition: 'all 0.12s',
                    background: userAction === opt.key ? '#f3e8ff' : '#fff',
                    border: `1.5px solid ${userAction === opt.key ? '#7c3aed' : '#e2e8f0'}`
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: userAction === opt.key ? '#7c3aed' : '#fff',
                    border: `2px solid ${userAction === opt.key ? '#7c3aed' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {userAction === opt.key && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                  </div>
                  <span style={{ fontSize: 16 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: userAction === opt.key ? '#7c3aed' : '#1e293b', margin: 0 }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Transfer target selector */}
            {userAction === 'transfer' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                  TRANSFER TO AGENT
                </label>
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                  style={{ ...inp, background: '#fff' }}>
                  <option value="">Select agent...</option>
                  {otherAgents.map(a => (
                    <option key={a.id} value={a.id}>{a.username} ({a.email})</option>
                  ))}
                </select>
                {otherAgents.length === 0 && (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '6px 0 0' }}>⚠️ No other active agents available for transfer.</p>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <div style={{ display: 'flex', gap: 10, padding: '6px 0 4px' }}>
            <button onClick={onClose}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              Cancel
            </button>
            <button onClick={handleSave}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                background: saved ? '#22c55e' : '#7c3aed', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)'
              }}>
              <Save size={13} /> {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Create Agent Modal ── */
function CreateAgentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: Agent) => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', commission: '10'
  })
  const [saved, setSaved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6
  }

  const handleCreate = () => {
    if (!form.firstName || !form.email) return
    const username = form.lastName ? `${form.firstName}_${form.lastName}` : form.firstName
    const agent: Agent = {
      id: 'a' + Date.now(), username, email: form.email,
      commission: parseFloat(form.commission) || 10,
      usersCount: 0, role: 'agent', balance: 0, status: 'active',
      joinedAt: new Date().toISOString().slice(0, 10)
    }
    onAdd(agent)
    setSaved(true); setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: 520,
        maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>

        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Create New Agent</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Fill in agent information</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>FIRST NAME *</label>
              <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="e.g. Agent" style={inp} /></div>
            <div><label style={lbl}>LAST NAME</label>
              <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="e.g. BD_01" style={inp} /></div>
          </div>
          <div><label style={lbl}>EMAIL *</label>
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="agent@bittxsms.com" style={inp} /></div>
          <div><label style={lbl}>PHONE</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+880..." style={inp} /></div>
          <div><label style={lbl}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set password..." style={{ ...inp, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div><label style={lbl}>COMMISSION %</label>
            <input type="number" value={form.commission} onChange={e => setForm(p => ({ ...p, commission: e.target.value }))} min="0" max="50" style={inp} /></div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer'
              }}>
              Cancel
            </button>
            <button onClick={handleCreate}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                background: saved ? '#22c55e' : '#7c3aed', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
              <Plus size={13} /> {saved ? '✓ Created!' : 'Create Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Delete Confirmation Modal with Transfer Option ── */
function DeleteConfirmModal({ agent, allAgents, onClose, onConfirm, onTransferAndDelete }: {
  agent: Agent; allAgents: Agent[]; onClose: () => void; onConfirm: () => void; onTransferAndDelete: (targetAgentId: string) => void
}) {
  const [mode, setMode] = useState<'choose' | 'transfer' | 'delete'>('choose')
  const [targetAgentId, setTargetAgentId] = useState('')
  const otherAgents = allAgents.filter(a => a.id !== agent.id && a.status === 'active')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 28px' }}>
          {mode === 'choose' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Delete Agent "{agent.username}"?</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Choose how to handle this agent's users</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <button onClick={() => setMode('transfer')} style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f0fdf4', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <RefreshCw size={16} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Transfer Users & Delete</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Move all users to another agent first, then delete this agent</div>
                </div>
              </button>
              <button onClick={() => setMode('delete')} style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Trash2 size={16} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Delete Everything</div>
                  <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>Delete agent + ALL their users, OTPs, withdrawals permanently</div>
                </div>
              </button>
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
          </>)}

          {mode === 'transfer' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RefreshCw size={20} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Transfer Users</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Select agent to receive "{agent.username}"'s users</p>
              </div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>TRANSFER TO</label>
            <select value={targetAgentId} onChange={e => setTargetAgentId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}>
              <option value="">-- Select Agent --</option>
              {otherAgents.map(a => <option key={a.id} value={a.id}>{a.username} ({a.email})</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('choose')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Back</button>
              <button onClick={() => { if (targetAgentId) onTransferAndDelete(targetAgentId) }} disabled={!targetAgentId}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: targetAgentId ? '#22c55e' : '#e2e8f0', color: targetAgentId ? '#fff' : '#94a3b8', cursor: targetAgentId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={13} /> Transfer & Delete
              </button>
            </div>
          </>)}

          {mode === 'delete' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991b1b', margin: 0 }}>Delete Everything?</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>This cannot be undone</p>
              </div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 14px', border: '1px solid #fecaca', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#991b1b', margin: 0, lineHeight: 1.6 }}>
                <strong>{agent.username}</strong> and <strong>ALL their users</strong> will be permanently deleted. This includes OTP logs, withdrawals, support tickets, and all other data.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('choose')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Back</button>
              <button onClick={onConfirm}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete Everything
              </button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function AdminAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewAgent, setViewAgent] = useState<Agent | null>(null)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchAgents = async () => {
    try {
      const response = await adminApi.agents()
      const rawAgents: any[] = response?.agents || response?.data || []
      const formattedAgents: Agent[] = rawAgents.map((a: any) => ({
        id: a._id || a.id || '',
        username: a.username || '',
        email: a.email || '',
        commission: a.commission ?? 10,
        usersCount: a.usersCount ?? 0,
        totalRevenue: 0,
        status: a.status || 'active',
        joinedAt: a.joinedAt ? new Date(a.joinedAt).toISOString().slice(0, 10) : '—',
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        phone: a.phone || '',
        country: a.country || '',
        city: a.city || '',
        telegram: a.telegram || '',
        balance: a.balance ?? 0,
        apiEnabled: a.apiEnabled != null ? a.apiEnabled : true,
        lastLogin: a.lastLogin || '',
        role: a.role || 'agent',
        totalEarned: a.totalEarned ?? 0,
        otpCount: a.otpCount ?? 0,
        failedOtps: a.failedOtps ?? 0,
        successRate: a.successRate ?? 0,
        otpActive: a.otpActive ?? false,
        apiKey: a.apiKey || '',
        sessions: a.sessions || [],
      }))
      setAgents(formattedAgents)

      // Enrich with per-agent user/OTP stats from the users list
      try {
        const usersRes = await import('../../lib/api').then(m => m.api.get('/users'))
        const allUsers: any[] = (usersRes as any)?.users || []
        setAgents(prev => prev.map(ag => {
          const agUsers = allUsers.filter((u: any) =>
            String(u.agentId) === String(ag.id) || u.agentEmail === ag.email
          )
          const totalOTPs = agUsers.reduce((s: number, u: any) => s + (u.otpCount ?? 0), 0)
          const totalFailed = agUsers.reduce((s: number, u: any) => s + (u.failedOtps ?? 0), 0)
          return { ...ag, usersCount: agUsers.length, otpCount: totalOTPs, failedOtps: totalFailed }
        }))
      } catch {}
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'agents') fetchAgents()
    })
    return unsub
  }, [])

  const handleSaveAgent = async (updated: Agent) => {
    try {
      const data: any = {
        username:   updated.username,
        email:      updated.email,
        firstName:  updated.firstName || '',
        lastName:   updated.lastName || '',
        phone:      updated.phone || '',
        country:    updated.country || '',
        city:       updated.city || '',
        telegram:   updated.telegram || '',
        commission: updated.commission,
        balance:    (updated as any).balance || 0,
        status:     updated.status,
      }
      if ((updated as any).password) data.password = (updated as any).password
      await adminApi.updateAgent(updated.id || (updated as any)._id, data)
    } catch {}
    setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
    setEditAgent(null)
  }

  const handleAddAgent = async (u: { username: string; email: string; phone: string; password?: string;
    firstName?: string; lastName?: string; country?: string; city?: string; telegram?: string;
    bio?: string; birthDate?: string; timezone?: string; address?: string; commission?: string }) => {
    try {
      const response = await adminApi.createAgent({
        username:   u.username,
        email:      u.email,
        phone:      u.phone || '',
        password:   u.password || 'Agent@123456',
        firstName:  u.firstName || '',
        lastName:   u.lastName || '',
        country:    u.country || '',
        city:       u.city || '',
        telegram:   u.telegram || '',
        bio:        u.bio || '',
        birthDate:  u.birthDate || '',
        timezone:   u.timezone || '',
        address:    u.address || '',
        commission: parseFloat(u.commission || '15'),
      })
      const agentData = response.agent || response.user
      const agent: Agent = {
        id:           agentData._id || agentData.id,
        username:     agentData.username,
        email:        agentData.email,
        commission:   agentData.commission || 15,
        usersCount:   0,
        role:         agentData.role || 'agent',
        status:       agentData.status,
        joinedAt:     new Date(agentData.joinedAt || agentData.createdAt).toISOString().slice(0, 10),
        firstName:    agentData.firstName || u.firstName || '',
        lastName:     agentData.lastName || u.lastName || '',
        phone:        agentData.phone || u.phone || '',
        country:      agentData.country || u.country || '',
        city:         agentData.city || u.city || '',
        telegram:     agentData.telegram || u.telegram || '',
        balance:      agentData.balance || 0,
        apiEnabled:   agentData.apiEnabled != null ? agentData.apiEnabled : true,
        lastLogin:    agentData.lastLogin || '',
      }
      setAgents(prev => [...prev, agent])
      setShowCreate(false)
    } catch (error: any) {
      flash(false, error.message || 'Failed to create agent')
    }
  }

  const toggleStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id)
    if (!agent) return
    const newStatus = agent.status === 'active' ? 'inactive' : 'active'
    try {
      await adminApi.updateAgent(id, { status: newStatus })
    } catch {}
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a))
  }

  const handleDeleteAgent = async () => {
    if (!deleteAgent) return
    try {
      await api.post(`/admin/agents/${deleteAgent.id}/delete-with-users`, {})
    } catch {}
    setAgents(prev => prev.filter(a => a.id !== deleteAgent.id))
    setDeleteAgent(null)
    fetchAgents()
  }

  const handleTransferAndDelete = async (targetAgentId: string) => {
    if (!deleteAgent) return
    try {
      const r = await api.post(`/admin/agents/${deleteAgent.id}/transfer-and-delete`, { targetAgentId })
      flash(true, r.message || 'Transfer complete')
    } catch (e: any) {
      flash(false, 'Failed: ' + (e.message || 'Unknown error'))
      return
    }
    setDeleteAgent(null)
    fetchAgents()
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading agents...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      {viewAgent && <AgentViewModal agent={viewAgent} onClose={() => setViewAgent(null)} />}
      {editAgent && <AgentEditModal agent={editAgent} onClose={() => setEditAgent(null)} onSave={handleSaveAgent} />}
      {showCreate && <AddUserModal mode="agent" onClose={() => setShowCreate(false)} onAdd={handleAddAgent} />}
      {deleteAgent && <DeleteConfirmModal agent={deleteAgent} allAgents={agents} onClose={() => setDeleteAgent(null)} onConfirm={handleDeleteAgent} onTransferAndDelete={handleTransferAndDelete} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Agent Management</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {agents.filter(a => a.status === 'active').length} active agents
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer'
          }}>
          <Plus size={14} /> Create Agent
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['Agent', 'Commission', 'Status', 'Total Users', 'Total OTPs', 'Total Failed', 'Balance', 'Joined', 'Actions'].map((h, i) => (
                <th key={h} style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 14px',
                  textAlign: i === 8 ? 'right' : 'left', whiteSpace: 'nowrap'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              return (
                <tr key={agent.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50 transition-colors">
                  {/* Agent */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: '#fff'
                      }}>
                        {(agent.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{cleanAgentName(agent.username)}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{agent.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Commission */}
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                    {agent.commission}%
                  </td>
                  {/* Status */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase',
                      background: agent.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: agent.status === 'active' ? '#16a34a' : '#94a3b8'
                    }}>
                      {agent.status}
                    </span>
                  </td>
                  {/* Total Users */}
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                    {(agent.usersCount ?? 0).toLocaleString()}
                  </td>
                  {/* Total OTPs */}
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>
                    {((agent as any).otpCount ?? 0).toLocaleString()}
                  </td>
                  {/* Total Failed */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: ((agent as any).failedOtps ?? 0) > 0 ? '#ef4444' : '#94a3b8',
                      background: ((agent as any).failedOtps ?? 0) > 0 ? '#fee2e2' : '#f1f5f9',
                      padding: '3px 10px', borderRadius: 20, display: 'inline-block',
                    }}>
                      {((agent as any).failedOtps ?? 0).toLocaleString()}
                    </span>
                  </td>
                  {/* Balance */}
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                    ${((agent as any).balance ?? 0).toFixed(2)}
                  </td>
                  {/* Joined */}
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {agent.joinedAt}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button onClick={() => setViewAgent(agent)} title="View"
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setEditAgent(agent)} title="Edit"
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => toggleStatus(agent.id || '')} title={agent.status === 'active' ? 'Deactivate' : 'Activate'}
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: `1px solid ${agent.status === 'active' ? '#fee2e2' : '#dcfce7'}`, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: agent.status === 'active' ? '#ef4444' : '#16a34a' }}>
                        {agent.status === 'active' ? <Ban size={14} /> : <RefreshCw size={14} />}
                      </button>
                      <button onClick={() => setDeleteAgent(agent)} title="Delete Agent"
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #fee2e2', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
