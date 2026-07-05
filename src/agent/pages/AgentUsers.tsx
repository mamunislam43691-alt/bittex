import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Edit2, Ban, X, Save, Zap, ZapOff, Eye, Search, Copy, Check, RefreshCw, Trash2 } from 'lucide-react'
import { usersApi, normalizeEmail } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

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
            {copied ? <Check size={10} /> : <Copy size={10} />}{copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

interface UserObj {
  _id: string; id?: string; username: string; firstName?: string; lastName?: string;
  email: string; phone: string; country: string; city?: string;
  status: string; otpCount: number; successRate: number;
  otpActive: boolean; apiEnabled: boolean; lastOtpAt?: string;
  joinedAt: string; lastLogin?: string; profileComplete?: boolean;
  sessions?: any[]; agentEmail?: string; agentId?: string;
  telegram?: string; address?: string; birthDate?: string; timezone?: string;
  bio?: string;
}

function UserModal({ user, onClose, onSaved }: { user: UserObj; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<'info' | 'edit'>('info')
  const [status, setStatus] = useState(user.status)
  const [apiEnabled, setApiEnabled] = useState(user.apiEnabled)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await usersApi.update(user._id || user.id || '', { status, apiEnabled })
      setSaved(true)
      onSaved()
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (err: any) {
      flash(false, 'Failed to save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleBanToggle = () => setStatus(s => s === 'banned' ? 'active' : 'banned')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {msg && <div style={{ padding: '10px 14px', margin: '12px 16px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {(user.firstName || user.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{user.firstName || user.username} {user.lastName || ''}</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 22px' }}>
          {(['info', 'edit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
                color: tab === t ? '#6366f1' : '#64748b', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent'
              }}>
              {t === 'info' ? 'Details' : 'Edit'}
            </button>
          ))}
        </div>
        <div style={{ padding: '18px 22px' }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Stats (no balance — only OTP stats) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {[
                  { label: 'OTPs Sent', value: (user.otpCount || 0).toLocaleString(), color: '#6366f1' },
                  { label: 'Success Rate', value: `${user.successRate || 0}%`, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* All User Info */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6366f1', margin: '0 0 12px' }}>User Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <CopyField label="Username" value={user.username || ''} />
                  <CopyField label="Full Name" value={`${user.firstName || ''} ${user.lastName || ''}`.trim()} />
                  <CopyField label="Email" value={user.email || ''} />
                  <CopyField label="Country" value={user.country || ''} />
                  <CopyField label="City" value={user.city || ''} />
                  <CopyField label="Address" value={user.address || ''} />
                  <CopyField label="Telegram" value={user.telegram || ''} />
                  <CopyField label="Birthday" value={user.birthDate || ''} />
                  <CopyField label="Timezone" value={user.timezone || ''} />
                </div>
                {user.bio && (
                  <div style={{ marginTop: 12 }}>
                    <CopyField label="Bio" value={user.bio} />
                  </div>
                )}
              </div>

              {/* Activity Info */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6366f1', margin: '0 0 12px' }}>Activity</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <CopyField label="Joined" value={user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} />
                  <CopyField label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : ''} />
                  <CopyField label="Status" value={(user.status || '').toUpperCase()} />
                  <CopyField label="Agent" value={user.agentEmail || ''} />
                </div>
              </div>

              {/* Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: apiEnabled ? '#dcfce7' : '#fee2e2', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 3px' }}>API Access</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: apiEnabled ? '#16a34a' : '#ef4444' }}>{apiEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: user.otpActive ? '#dcfce7' : '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 3px' }}>OTP Status</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: user.otpActive ? '#16a34a' : '#64748b' }}>{user.otpActive ? 'Sending' : 'Inactive'}</p>
                </div>
              </div>
            </div>
          )}
          {tab === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>STATUS</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['active', 'pending', 'banned'] as const).map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                        background: status === s ? (s === 'active' ? '#22c55e' : s === 'banned' ? '#ef4444' : '#f59e0b') : '#f1f5f9',
                        color: status === s ? '#fff' : '#64748b'
                      }}>{s}</button>
                  ))}
                </div>
              </div>
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
                  <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', left: apiEnabled ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              {/* (balance input removed — agents cannot edit user balance) */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={handleBanToggle}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: status === 'banned' ? '#dcfce7' : '#fee2e2', color: status === 'banned' ? '#16a34a' : '#ef4444'
                  }}>
                  {status === 'banned' ? 'Unban User' : 'Ban User'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer',
                    background: saved ? '#22c55e' : '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}>
                  <Save size={13} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [viewUser, setViewUser] = useState<UserObj | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserObj | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchUsers = useCallback(async () => {
    try {
      const response = await usersApi.list()
      const agentUsers = (response.users || []).filter((u: any) =>
        u.status !== 'pending'
      )
      setUsers(agentUsers)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'users') fetchUsers()
    })
    return unsub
  }, [fetchUsers])

  const activeUsers = users.filter(u => u.status === 'active')
  const bannedUsers = users.filter(u => u.status === 'banned')

  const handleQuickBan = async (u: UserObj) => {
    const newStatus = u.status === 'banned' ? 'active' : 'banned'
    try {
      await usersApi.update(u._id || u.id || '', { status: newStatus })
      fetchUsers()
    } catch (err: any) {
      flash(false, 'Failed: ' + (err.message || 'Unknown error'))
    }
  }

  const handleQuickToggleApi = async (u: UserObj) => {
    try {
      await usersApi.update(u._id || u.id || '', { apiEnabled: !u.apiEnabled })
      fetchUsers()
    } catch (err: any) {
      flash(false, 'Failed: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteUser._id || deleteUser.id || '')
      setDeleteUser(null)
      fetchUsers()
    } catch (err: any) {
      flash(false, 'Failed to delete: ' + (err.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading users...</div>
  }

  const filtered = users.filter(u => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      {viewUser && <UserModal user={viewUser} onClose={() => setViewUser(null)} onSaved={fetchUsers} />}

      {deleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '95vw', padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Delete User</h3>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteUser.username}</strong>?
              </p>
              <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0', fontWeight: 600 }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '20px 24px 24px' }}>
              <button onClick={() => setDeleteUser(null)} disabled={deleting}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: deleting ? 'wait' : 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: deleting ? '#fca5a5' : '#ef4444', color: '#fff', cursor: deleting ? 'wait' : 'pointer' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>My Users</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {users.length} users · {activeUsers.length} active · {bannedUsers.length} banned
          </p>
        </div>
        <button onClick={fetchUsers}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff',
            color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
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
          <option value="all">All Status</option><option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{filtered.length} results</span>
      </div>

      {/* Users Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['USER', 'OTP STATUS', 'COUNTRY', 'OTPs', 'SUCCESS RATE', 'STATUS', 'JOINED', 'ACTIONS'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const uid = u._id || u.id || ''
              return (
                <tr key={uid} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50 transition-colors">
                  <td style={{ padding: '13px 14px' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{u.username}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{u.email}</p>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    {u.otpActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '2px 8px', borderRadius: 20, background: '#dcfce7', display: 'inline-block' }}>SENDING</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', display: 'inline-block' }}>INACTIVE</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: '#475569' }}>{u.country || '—'}</td>
                  <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 700, color: '#6366f1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{u.otpCount || 0}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>sent</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, minWidth: 50 }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${u.successRate || 0}%`, background: (u.successRate || 0) > 70 ? '#22c55e' : (u.successRate || 0) > 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b', minWidth: 36 }}>{u.successRate || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase',
                      background: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: u.status === 'active' ? '#16a34a' : '#dc2626'
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => setViewUser(u)} title="View / Edit"
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e0e7ff', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleQuickBan(u)} title={u.status === 'banned' ? 'Unban' : 'Ban'}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Ban size={13} />
                      </button>
                      <button onClick={() => handleQuickToggleApi(u)} title={u.apiEnabled ? 'Disable API' : 'Enable API'}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${u.apiEnabled ? '#fef3c7' : '#dbeafe'}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.apiEnabled ? '#f59e0b' : '#3b82f6' }}>
                        {u.apiEnabled ? <ZapOff size={13} /> : <Zap size={13} />}
                      </button>
                      <button onClick={() => setDeleteUser(u)} title="Delete User"
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No users found</div>}
      </div>
    </div>
  )
}
