import { useState, useEffect } from 'react'
import { Search, Ban, Edit2, Plus, Download, Eye, EyeOff, Copy, Check, X, Save, Zap, ZapOff, Trash2, AlertTriangle } from 'lucide-react'
import { User, Role, LoginSession } from '../data/types'
import AddUserModal from '../components/AddUserModal'
import OTPTargetSection, { OTPTarget } from '../components/OTPTargetSection'

interface ConfirmDialogProps {
  open: boolean; title: string; message: string; confirmLabel?: string; confirmColor?: string; icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void
}
function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmColor = '#ef4444', icon, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: confirmColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon || <AlertTriangle size={22} color={confirmColor} />}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: confirmColor, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
import SecurityTab from '../components/SecurityTab'
import { usersApi, api } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  superadmin: { bg: '#fef2f2', text: '#dc2626' },
  admin: { bg: '#fee2e2', text: '#ef4444' },
  moderator: { bg: '#fef3c7', text: '#b45309' },
  support: { bg: '#dbeafe', text: '#2563eb' },
  agent: { bg: '#f3e8ff', text: '#7c3aed' },
  user: { bg: '#f1f5f9', text: '#475569' },
}

/* ── Copy helper ── */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#1e293b', flex: 1, wordBreak: 'break-all' }}>{value || '—'}</span>
        {value && (
          <button onClick={copy} style={{
            flexShrink: 0, background: copied ? '#dcfce7' : '#f1f5f9', border: 'none', borderRadius: 6,
            padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: copied ? '#16a34a' : '#475569',
            display: 'flex', alignItems: 'center', gap: 3
          }}>
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── User Detail / Edit Modal ── */
function UserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [tab, setTab] = useState<'info' | 'edit' | 'security'>('info')
  const [balance, setBalance] = useState((user.balance ?? 0).toString())
  const [addAmt, setAddAmt] = useState('')
  const [status, setStatus] = useState(user.status || 'active')
  const [apiEnabled, setApiEnabled] = useState(user.apiEnabled ?? false)
  const [saved, setSaved] = useState(false)
  const [otpTarget, setOtpTarget] = useState<OTPTarget>({ enabled: false, period: 'daily', limit: 1000, action: 'suspend' })
  const [sessions, setSessions] = useState<LoginSession[]>(user.sessions ?? [])
  const [email, setEmail] = useState(user.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const agentName = (user as any).agentUsername || (user as any).agentEmail || '—'
  const agentEmail = (user as any).agentEmail || '—'

  const handleSave = async () => {
    try {
      const updateData: any = {
        balance: parseFloat(balance) || user.balance,
        status,
        apiEnabled,
      }
      if (email !== user.email) updateData.email = email
      if (password) updateData.password = password

      await usersApi.update(user.id || '', updateData)
      onSave({ ...user, ...updateData })
      setSaved(true); setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (error: any) {
      setSaved(false)
    }
  }
  const handleAddBalance = () => {
    const a = parseFloat(addAmt)
    if (!a || isNaN(a)) return
    const nb = (parseFloat(balance) || 0) + a
    setBalance(nb.toFixed(2)); setAddAmt('')
  }
  const handleBanToggle = () => setStatus(s => s === 'banned' ? 'active' : 'banned')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: 540,
        maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0
            }}>
              {user.username[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>{user.username}</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 22px' }}>
          {(['info', 'edit', 'security'] as const).map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
                color: tab === t ? '#7c3aed' : '#64748b',
                borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent'
              }}>
              {t === 'info' ? '📋 Details' : t === 'edit' ? '✏️ Edit' : '🔒 Security'}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 22px' }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Balance', value: `$${(user.balance ?? 0).toFixed(2)}`, color: '#22c55e' },
                  { label: 'OTPs Sent', value: (user.otpCount ?? 0).toLocaleString(), color: '#6366f1' },
                  { label: 'Failed OTPs', value: (user.failedOtps ?? 0).toLocaleString(), color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Info fields */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7c3aed', margin: '0 0 12px' }}>User Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <CopyField label="Username" value={user.username || ''} />
                  <CopyField label="Full Name" value={`${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim()} />
                  <CopyField label="Email" value={user.email || ''} />
                  <CopyField label="Phone" value={user.phone || ''} />
                  <CopyField label="Country" value={user.country || ''} />
                  <CopyField label="City" value={(user as any).city || ''} />
                  <CopyField label="Address" value={(user as any).address || ''} />
                  <CopyField label="Telegram" value={(user as any).telegram || ''} />
                  <CopyField label="Birthday" value={(user as any).birthDate || ''} />
                  <CopyField label="Timezone" value={(user as any).timezone || ''} />
                </div>
                {(user as any).bio && (
                  <div style={{ marginTop: 12 }}>
                    <CopyField label="Bio" value={(user as any).bio} />
                  </div>
                )}
              </div>
              {/* Activity fields */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7c3aed', margin: '0 0 12px' }}>Activity</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <CopyField label="Joined" value={user.joinedAt || ''} />
                  <CopyField label="Last Login" value={user.lastLogin && user.lastLogin !== '—' ? new Date(user.lastLogin).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'} />
                  <CopyField label="Agent Name" value={agentName} />
                  <CopyField label="Agent Email" value={agentEmail} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: user.status === 'active' ? '#dcfce7' : user.status === 'banned' ? '#fee2e2' : '#fef9c3', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 3px' }}>Status</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: user.status === 'active' ? '#16a34a' : user.status === 'banned' ? '#dc2626' : '#b45309', textTransform: 'uppercase' }}>{status}</p>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 3px' }}>API Access</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: apiEnabled ? '#22c55e' : '#ef4444' }}>{apiEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          )}
          {tab === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
              </div>
              {/* Password */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>NEW PASSWORD (leave blank to keep current)</label>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter new password..."
                    style={{ width: '100%', padding: '9px 40px 9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {/* Balance */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>BALANCE (USD)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={balance} onChange={e => setBalance(e.target.value)} type="number" step="0.01"
                    style={{ flex: 1, padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={addAmt} onChange={e => setAddAmt(e.target.value)} type="number" placeholder="Add amount..."
                    style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }} />
                  <button onClick={handleAddBalance}
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
              </div>
              {/* Status + Ban toggle */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>STATUS</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['active', 'suspended', 'banned'] as const).map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                        background: status === s ? (s === 'active' ? '#22c55e' : s === 'banned' ? '#ef4444' : '#f59e0b') : '#f1f5f9',
                        color: status === s ? '#fff' : '#64748b'
                      }}>{s}</button>
                  ))}
                </div>
              </div>
              {/* API toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>API Key Access</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{apiEnabled ? 'Enabled' : 'Disabled'}</p>
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
              {/* OTP Target */}
              <OTPTargetSection value={otpTarget} onChange={setOtpTarget} />
              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={handleBanToggle}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: status === 'banned' ? '#dcfce7' : '#fee2e2', color: status === 'banned' ? '#16a34a' : '#ef4444'
                  }}>
                  {status === 'banned' ? '✓ Unban User' : '⊘ Ban User'}
                </button>
                <button onClick={handleSave}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: saved ? '#22c55e' : '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}>
                  <Save size={13} /> {saved ? '✓ Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
          {tab === 'security' && (
            <SecurityTab
              sessions={sessions}
              onUpdate={updated => {
                setSessions(updated)
                onSave({ ...user, sessions: updated })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Delete Confirmation Modal for Users ── */
function DeleteUserConfirmModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: 420,
        maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Trash2 size={28} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Delete User?</h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
            Are you sure you want to delete <strong>{user.username}</strong>? This will remove all user data including OTP history, balance, and account information. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer'
              }}>
              Cancel
            </button>
            <button onClick={onConfirm}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
              <Trash2 size={14} /> Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned' | 'suspended'>('all')
  const [otpFilter, setOtpFilter] = useState<'all' | 'sending' | 'not_sending'>('all')
  const [viewUser, setViewUser] = useState<User | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteAllFinal, setConfirmDeleteAllFinal] = useState(false)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchUsers = async () => {
    try {
      const response = await usersApi.list()
      const rawUsers: any[] = response?.users || response?.data || []
      const formattedUsers: User[] = rawUsers
        .filter((u: any) => u.role === 'user' || u.role === 'agent')
        .map((u: any) => ({
          id: u._id || u.id || '',
          username: u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role,
          balance: u.balance ?? 0,
          totalEarned: u.totalEarned ?? 0,
          status: u.status || 'pending',
          agentId: u.agentId || null,
          agentEmail: u.agentEmail || '',
          agentUsername: u.agentUsername || '',
          country: u.country || '',
          city: u.city || '',
          address: u.address || '',
          telegram: u.telegram || '',
          birthDate: u.birthDate || '',
          timezone: u.timezone || '',
          bio: u.bio || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          joinedAt: u.joinedAt ? new Date(u.joinedAt).toISOString().slice(0, 10) : '—',
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : '',
          otpCount: u.otpCount ?? 0,
          successRate: u.successRate ?? 0,
          failedOtps: u.failedOtps ?? 0,
          otpActive: u.otpActive ?? false,
          lastOtpAt: u.lastOtpAt || '',
          apiEnabled: u.apiEnabled ?? false,
          sessions: u.sessions || []
        }))
      setUsers(formattedUsers)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'users' || data.type === 'otps') fetchUsers()
    })
    return unsub
  }, [])

  const filtered = users.filter(u => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    if (otpFilter === 'sending' && !u.otpActive) return false
    if (otpFilter === 'not_sending' && u.otpActive) return false
    return true
  }).sort((a, b) => (b.otpCount ?? 0) - (a.otpCount ?? 0))

  const handleSave = (updated: User) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))

  const handleBan = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    const newStatus = user.status === 'banned' ? 'active' : 'banned'
    try { await usersApi.update(id, { status: newStatus }) } catch {}
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u))
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    try { await usersApi.delete(deleteUser.id || '') } catch {}
    setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
    setDeleteUser(null)
  }

  const handleDeleteAllUsers = async () => {
    const allUsers = users.filter(u => u.role === 'user')
    if (allUsers.length === 0) { flash(false, 'No users to delete'); return }
    setConfirmDeleteAll(true)
  }
  const doDeleteAllUsers = async () => {
    setConfirmDeleteAll(false)
    setConfirmDeleteAllFinal(true)
  }
  const doDeleteAllUsersFinal = async () => {
    setConfirmDeleteAllFinal(false)
    try {
      const r = await api.post('/admin/delete-all-users', {})
      flash(true, r.message || 'Users deleted successfully')
      fetchUsers()
    } catch (e: any) {
      flash(false, 'Failed: ' + (e.message || 'Unknown error'))
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading users...</div>
  }

  const allUserCount = users.filter(u => u.role === 'user').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ConfirmDialog open={confirmDeleteAll} title="Delete ALL Users?"
        message={`⚠️ DELETE ALL ${allUserCount} USERS?\n\nThis will permanently remove all users and ALL their data (OTP logs, withdrawals, sessions, etc.).\n\nAgents will NOT be deleted.\n\nThis action cannot be undone!`}
        confirmLabel="Yes, Delete All" confirmColor="#ef4444"
        icon={<Trash2 size={22} color="#ef4444" />}
        onConfirm={doDeleteAllUsers} onCancel={() => setConfirmDeleteAll(false)} />
      <ConfirmDialog open={confirmDeleteAllFinal} title="Are you ABSOLUTELY sure?"
        message={`This is your LAST CHANCE to cancel.\n\n${allUserCount} users and ALL their data will be permanently erased.\n\nThis CANNOT be undone.`}
        confirmLabel="DELETE EVERYTHING" confirmColor="#dc2626"
        icon={<AlertTriangle size={22} color="#dc2626" />}
        onConfirm={doDeleteAllUsersFinal} onCancel={() => setConfirmDeleteAllFinal(false)} />
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      {viewUser && <UserModal user={viewUser} onClose={() => setViewUser(null)} onSave={u => { handleSave(u); setViewUser(null) }} />}
      {deleteUser && <DeleteUserConfirmModal user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDeleteUser} />}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onAdd={async (u) => {
        try {
          const response = await usersApi.create({
            username: u.username,
            email: u.email,
            phone: u.phone,
            password: u.password || 'default123',
            role: 'user',
            status: 'active',
          })
          const ru = response?.user || response || {}
          const nu: User = {
            id: ru._id || ru.id || '',
            username: ru.username || u.username,
            email: ru.email || u.email,
            phone: ru.phone || u.phone || '',
            role: ru.role || 'user',
            balance: ru.balance ?? 0,
            totalEarned: ru.totalEarned ?? 0,
            status: ru.status || 'active',
            agentId: ru.agentId || null,
            country: ru.country || '',
            joinedAt: ru.joinedAt ? new Date(ru.joinedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            lastLogin: ru.lastLogin ? new Date(ru.lastLogin).toISOString().slice(0, 10) : '—',
            otpCount: ru.otpCount ?? 0,
            successRate: ru.successRate ?? 0,
            failedOtps: ru.failedOtps ?? 0,
            otpActive: ru.otpActive ?? false,
            lastOtpAt: ru.lastOtpAt || '',
            apiEnabled: ru.apiEnabled ?? false,
            sessions: ru.sessions || []
          }
          setUsers(p => [...p, nu]); setShowAddUser(false); flash(true, 'User created!')
        } catch (error: any) {
          flash(false, error.message || 'Failed to create user')
        }
      }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>User Management</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{users.length} total users</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handleDeleteAllUsers}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={14} /> Delete All Users
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => setShowAddUser(true)}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input placeholder="Search by username or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select value={otpFilter} onChange={e => setOtpFilter(e.target.value as any)}
          style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
          <option value="all">All OTP</option>
          <option value="sending">OTP Sending</option>
          <option value="not_sending">Not Sending</option>
        </select>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{filtered.length} results</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['USER', 'OTP STATUS', 'COUNTRY', 'BALANCE', 'OTPS', 'TOTAL FAILED', 'STATUS', 'JOINED', 'ACTIONS'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50 transition-colors">
                <td style={{ padding: '13px 14px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{u.username}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{u.email}</p>
                </td>
                <td style={{ padding: '13px 14px' }}>
                  {u.otpActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '2px 8px', borderRadius: 20, background: '#dcfce7', display: 'inline-block' }}>● SENDING</span>
                      {u.lastOtpAt && <span style={{ fontSize: 10, color: '#94a3b8' }}>Last: {u.lastOtpAt}</span>}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', display: 'inline-block' }}>○ INACTIVE</span>
                  )}
                </td>
                <td style={{ padding: '13px 14px', fontSize: 13, color: '#475569' }}>{u.country}</td>
                <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>${(u.balance ?? 0).toFixed(2)}</td>
                <td style={{ padding: '13px 14px', fontSize: 13, color: '#475569' }}>{(u.otpCount ?? 0).toLocaleString()}</td>
                <td style={{ padding: '13px 14px' }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: (u.failedOtps ?? 0) > 0 ? '#ef4444' : '#94a3b8',
                    padding: '3px 10px', borderRadius: 20, display: 'inline-block',
                    background: (u.failedOtps ?? 0) > 0 ? '#fee2e2' : '#f1f5f9',
                  }}>
                    {(u.failedOtps ?? 0).toLocaleString()}
                  </span>
                </td>
                <td style={{ padding: '13px 14px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase',
                    background: u.status === 'active' ? '#dcfce7' : u.status === 'banned' ? '#fee2e2' : '#fef9c3',
                    color: u.status === 'active' ? '#16a34a' : u.status === 'banned' ? '#dc2626' : '#b45309'
                  }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: '13px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{u.joinedAt}</td>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setViewUser(u)} title="View Details"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e0e7ff', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <Eye size={13} />
                    </button>
                    <button onClick={() => setViewUser(u)} title="Edit"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleBan(u.id || '')} title={u.status === 'banned' ? 'Unban' : 'Ban'}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Ban size={13} />
                    </button>
                    <button onClick={() => setDeleteUser(u)} title="Delete User"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No users found</div>}
      </div>
    </div>
  )
}
