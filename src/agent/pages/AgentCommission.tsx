import { useState, useEffect, useCallback } from 'react'
import { Edit2, Save, X, RefreshCw, Check, DollarSign, Users, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usersApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

export default function AgentCommission() {
  const { user } = useAuth()
  const [myUsers, setMyUsers]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal,   setEditVal]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const fetchMyUsers = useCallback(async () => {
    try {
      const res = await usersApi.list()
      setMyUsers((res?.users || []).filter((u: any) => u.status === 'active'))
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyUsers()
    const unsub = onDataUpdated((data: any) => {
      if (data.type === 'users') fetchMyUsers()
    })
    const interval = setInterval(fetchMyUsers, 60000)
    return () => { unsub(); clearInterval(interval) }
  }, [fetchMyUsers])

  const defaultCommission = user?.commission ?? 10

  // Effective commission for a user: customCommission if set, else agent default
  const effectiveComm = (u: any) =>
    u.customCommission != null ? u.customCommission : defaultCommission

  const totalEarned = myUsers.reduce((s, u) => s + (u.totalEarned || 0), 0)
  const totalAgentComm = myUsers.reduce((s, u) => {
    return s + (u.totalEarned || 0) * effectiveComm(u) / 100
  }, 0)

  const openEdit = (u: any) => {
    setEditingId(u._id || u.id)
    setEditVal(u.customCommission != null ? String(u.customCommission) : String(defaultCommission))
  }

  const cancelEdit = () => { setEditingId(null); setEditVal('') }

  const saveCommission = async (userId: string) => {
    setSaving(true)
    try {
      const val = editVal.trim() === '' ? null : parseFloat(editVal)
      if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
        flash(false, 'Commission must be between 0 and 100')
        setSaving(false)
        return
      }
      await usersApi.setCommission(userId, val)
      setMyUsers(p => p.map(u =>
        (u._id || u.id) === userId ? { ...u, customCommission: val } : u
      ))
      setEditingId(null)
      flash(true, val === null ? 'Reset to default commission' : `Commission set to ${val}%`)
    } catch (e: any) {
      flash(false, e.message || 'Failed to update commission')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Commission</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Set per-user commission rates · Default: <strong>{defaultCommission}%</strong>
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchMyUsers() }} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0',
            background: '#fff', color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
          color: msg.ok ? '#16a34a' : '#dc2626' }}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Default Rate',    value: `${defaultCommission}%`, sub: 'Set by admin', color: '#6366f1', icon: <DollarSign size={18}/> },
          { label: 'Total Earned',    value: `$${totalAgentComm.toFixed(4)}`, sub: 'Your total commission', color: '#22c55e', icon: <TrendingUp size={18}/> },
          { label: 'Active Users',    value: String(myUsers.length), sub: 'Generating revenue', color: '#0ea5e9', icon: <Users size={18}/> },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 4px' }}>{c.label}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: c.color, margin: 0, lineHeight: 1 }}>{c.value}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-User Commission Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Per-User Commission Rates
          </h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Click <strong>Edit</strong> to override a user's rate
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        ) : myUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No active users yet.
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
              {['USER', 'USER EARNED', 'COMMISSION', 'YOUR EARN', 'ACTION'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#94a3b8' }}>{h}</span>
              ))}
            </div>

            {myUsers.map(u => {
              const uid = u._id || u.id
              const comm = effectiveComm(u)
              const agentEarn = (u.totalEarned || 0) * comm / 100
              const isEditing = editingId === uid
              const isCustom = u.customCommission != null

              return (
                <div key={uid}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                    padding: '12px 20px', borderBottom: '1px solid #f8fafc',
                    gap: 12, alignItems: 'center',
                    background: isEditing ? '#f8f7ff' : 'transparent' }}>

                  {/* User info */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{u.username}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{u.email}</p>
                  </div>

                  {/* User total earned */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    ${(u.totalEarned || 0).toFixed(4)}
                  </span>

                  {/* Commission rate cell */}
                  <div>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                        background: '#f5f3ff', borderRadius: 8, padding: '6px 10px',
                        border: '1.5px solid #7c3aed' }}>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveCommission(uid); if (e.key === 'Escape') cancelEdit() }}
                          style={{ width: 52, border: 'none', background: 'transparent',
                            fontSize: 14, fontWeight: 700, color: '#7c3aed', outline: 'none' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>%</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800,
                          color: isCustom ? '#7c3aed' : '#64748b' }}>
                          {comm}%
                        </span>
                        {isCustom ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px',
                            borderRadius: 10, background: '#ede9fe', color: '#7c3aed' }}>
                            custom
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>default</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Agent commission earned */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                    +${agentEarn.toFixed(4)}
                  </span>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveCommission(uid)} disabled={saving}
                          style={{ display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                            background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          {saving ? <RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={11} />}
                          Save
                        </button>
                        <button onClick={cancelEdit}
                          style={{ display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                            background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer' }}>
                          <X size={11} /> Cancel
                        </button>
                        {isCustom && (
                          <button onClick={() => { setEditVal(''); saveCommission(uid) }}
                            title="Reset to default"
                            style={{ padding: '5px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                              background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer' }}>
                            Reset
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => openEdit(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe', cursor: 'pointer' }}>
                        <Edit2 size={11} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Total row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              padding: '12px 20px', background: '#f0fdf4', gap: 12, alignItems: 'center',
              borderTop: '2px solid #bbf7d0' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>TOTAL</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>${totalEarned.toFixed(4)}</span>
              <span />
              <span style={{ fontSize: 15, fontWeight: 900, color: '#16a34a' }}>+${totalAgentComm.toFixed(4)}</span>
              <span />
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 18px',
        border: '1px solid #fde68a', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
        <strong>ℹ️ How it works:</strong> Your default commission rate is set by admin ({defaultCommission}%).
        You can override individual users' commission. A custom rate only affects future OTPs — past earnings are not affected.
        Reset to "default" removes the override.
      </div>
    </div>
  )
}
