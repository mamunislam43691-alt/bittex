import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AlertTriangle, UserCheck, UserX, RefreshCw, Search, Clock, Eye, X, Copy, Check } from 'lucide-react'
import { usersApi, normalizeEmail } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'
import ConfirmDialog from '../../components/ConfirmDialog'

interface UserObj {
  _id: string; id?: string; username: string; firstName?: string; lastName?: string;
  email: string; phone: string; country: string; city?: string;
  status: string; profileComplete?: boolean; joinedAt: string; agentEmail?: string;
}

export default function AgentPendingUsers() {
  const { user } = useAuth()
  const [pendingUsers, setPendingUsers] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewUser, setViewUser] = useState<UserObj | null>(null)
  const [msg, setMsg] = useState({ok:true,text:''})
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg({ok:true,text:''}),3000) }
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const response = await usersApi.list()
      const pending = (response.users || []).filter((u: any) =>
        u.status === 'pending'
      )
      setPendingUsers(pending)
    } catch (error) {
      console.error('Failed to fetch pending users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'users') fetchPending()
    })
    return unsub
  }, [fetchPending])

  const handleApprove = async (userId: string) => {
    try {
      await usersApi.update(userId, { status: 'active' })
      fetchPending()
    } catch (error: any) {
      flash(false, 'Failed to approve: ' + (error.message || 'Unknown error'))
    }
  }

  const handleReject = async (userId: string) => {
    setRejectTarget(null)
    try {
      await usersApi.delete(userId)
      fetchPending()
      flash(true, 'User rejected and removed')
    } catch (error: any) {
      flash(false, 'Failed to reject: ' + (error.message || 'Unknown error'))
    }
  }

  const filtered = pendingUsers.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase().includes(q)
  })

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading pending users...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      {viewUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  {(viewUser.firstName || viewUser.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{viewUser.firstName || viewUser.username} {viewUser.lastName || ''}</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Pending Approval</p>
                </div>
              </div>
              <button onClick={() => setViewUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#f59e0b', margin: '0 0 12px' }}>User Information</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { label: 'First Name', value: viewUser.firstName || '—' },
                      { label: 'Last Name', value: viewUser.lastName || '—' },
                      { label: 'Username', value: viewUser.username || '—' },
                      { label: 'Email', value: viewUser.email || '—' },
                      { label: 'Phone', value: viewUser.phone || '—' },
                      { label: 'Country', value: viewUser.country || '—' },
                      { label: 'City', value: viewUser.city || '—' },
                    ].map(f => (
                      <div key={f.label}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 3px' }}>{f.label}</p>
                        <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, margin: 0, wordBreak: 'break-all' }}>{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#f59e0b', margin: '0 0 12px' }}>Status</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 3px' }}>Status</p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#fef3c7', color: '#f59e0b', textTransform: 'uppercase' }}>PENDING</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 3px' }}>Joined</p>
                      <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, margin: 0 }}>
                        {viewUser.joinedAt ? new Date(viewUser.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px' }}>
              <button onClick={() => { handleApprove(viewUser._id || viewUser.id || ''); setViewUser(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <UserCheck size={14} /> Approve
              </button>
              <button onClick={() => { setRejectTarget(viewUser._id || viewUser.id || ''); setViewUser(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <UserX size={14} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Pending Users</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {pendingUsers.length} user(s) waiting for your approval
          </p>
        </div>
        <button onClick={fetchPending}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff',
            color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #e2e8f0',
        display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13,
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
              outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{filtered.length} pending</span>
      </div>

      {/* Pending Users Table */}
      {filtered.length > 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #f59e0b', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fffbeb' }}>
                  {['USER', 'EMAIL', 'PHONE', 'COUNTRY', 'JOINED', 'ACTIONS'].map(h => (
                    <th key={h} style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#92400e', padding: '12px 16px',
                      textAlign: 'left', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const uid = u._id || u.id || ''
                  return (
                    <tr key={uid} style={{ borderBottom: '1px solid #fef3c7' }}
                      className="hover:bg-amber-50 transition-colors">
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 800, color: '#fff' }}>
                            {(u.firstName || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                              {u.firstName || u.username} {u.lastName || ''}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{u.email}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{u.phone || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{u.country || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setViewUser(u)}
                            style={{
                              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff' }}
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => handleApprove(uid)}
                            style={{
                              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: '#dcfce7', color: '#16a34a', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#bbf7d0' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#dcfce7' }}
                          >
                            <UserCheck size={13} /> Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(uid)}
                            style={{
                              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fecaca' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2' }}
                          >
                            <UserX size={13} /> Reject
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
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '60px 40px', textAlign: 'center'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Clock size={28} style={{ color: '#22c55e' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            {search ? 'No matching users' : 'All caught up!'}
          </h3>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            {search ? 'Try a different search term' : 'No pending users waiting for approval'}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject & Delete User?"
        message="This user will be permanently removed from your pending list and the database. This action cannot be undone."
        confirmLabel="Yes, Reject User"
        cancelLabel="Cancel"
        confirmColor="#ef4444"
        icon={<UserX size={20} />}
        onConfirm={() => { if (rejectTarget) return handleReject(rejectTarget) }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
