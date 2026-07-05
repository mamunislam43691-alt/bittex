import { useState, useEffect } from 'react'
import { Shield, Save, X, Check, Lock } from 'lucide-react'
import { adminApi, api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const PERM_LABELS: Record<string, string> = {
  all_access: 'Full System Access',
  user_manage: 'Manage Users', user_view: 'View Users', user_ban: 'Ban/Unban Users',
  agent_manage: 'Manage Agents', agent_view: 'View Agents',
  finance_manage: 'Manage Finance', withdrawal_view: 'View Withdrawals', withdrawal_manage: 'Manage Withdrawals', commission_view: 'View Commissions',
  announcement: 'Create Announcements', announcement_view: 'View Announcements',
  newsfeed: 'Manage News Feed', newsfeed_view: 'View News Feed',
  ticket_manage: 'Manage Support', ticket_view: 'View Support',
  otp_monitor: 'OTP Monitor', analytics: 'Analytics', system_settings: 'System Settings', role_manage: 'Role Management', database_manage: 'Database Management',
}

const PERM_GROUPS = [
  { label: 'Users', perms: ['user_manage','user_view','user_ban'] },
  { label: 'Agents', perms: ['agent_manage','agent_view'] },
  { label: 'Finance', perms: ['finance_manage','withdrawal_view','withdrawal_manage','commission_view'] },
  { label: 'Announcements', perms: ['announcement','announcement_view'] },
  { label: 'News Feed', perms: ['newsfeed','newsfeed_view'] },
  { label: 'Support', perms: ['ticket_manage','ticket_view'] },
  { label: 'System', perms: ['otp_monitor','analytics','system_settings','role_manage','database_manage','all_access'] },
]

const ROLE_META: Record<string, { name: string; color: string; level: number }> = {
  superadmin: { name: 'Super Admin', color: '#dc2626', level: 100 },
  admin:      { name: 'Admin',       color: '#ef4444', level: 80  },
  moderator:  { name: 'Moderator',   color: '#b45309', level: 60  },
  support:    { name: 'Support',     color: '#2563eb', level: 40  },
}

export default function AdminRoles() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  const [selectedRoleId, setSelectedRoleId] = useState('superadmin')
  const [defaults, setDefaults] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ok:boolean; text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null), 2500) }

  const load = () => {
    setLoading(true)
    adminApi.permissions()
      .then((data: any) => { setDefaults(data.defaults || {}); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const ROLES = Object.keys(ROLE_META).map(id => ({
    id, ...ROLE_META[id],
    permissions: defaults[id] || [],
  }))
  const selectedRole = ROLES.find(r => r.id === selectedRoleId) ?? ROLES[0]

  const startEdit = (roleId: string) => {
    setEditing(roleId)
    setDraft(defaults[roleId] || [])
  }
  const cancelEdit = () => { setEditing(null); setDraft([]) }
  const togglePerm = (p: string) => {
    setDraft(d => d.includes(p) ? d.filter(x => x !== p) : [...d, p])
  }
  const saveRole = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await api.put(`/admin/permissions/${editing}`, { permissions: draft })
      setDefaults(prev => ({ ...prev, [editing]: draft }))
      flash(true, `Permissions saved for "${ROLE_META[editing].name}"`)
      setEditing(null)
    } catch (e: any) {
      flash(false, e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: msg.ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
        color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Role Management</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {ROLES.length} roles configured · {isSuperAdmin ? 'Click a role to customize its default permissions. Individual admin permissions can still be edited on the Admins page.' : 'Default permissions per role. Individual admin permissions can be edited on the Admins page.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Role list */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Roles</h3>
          </div>
          {ROLES.map(role => (
            <div key={role.id} onClick={() => setSelectedRoleId(role.id)}
              style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                background: selectedRoleId === role.id ? `${role.color}08` : 'transparent',
                borderLeft: selectedRoleId === role.id ? `3px solid ${role.color}` : '3px solid transparent',
                transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={13} style={{ color: role.color }}/>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{role.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: `${role.color}15`, color: role.color }}>L{role.level}</span>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                {role.permissions.length} permissions
              </p>
            </div>
          ))}
        </div>

        {/* Permission view */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${selectedRole.color}06` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedRole.color }}/>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{selectedRole.name}</h3>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6,
                background: `${selectedRole.color}15`, color: selectedRole.color, fontWeight: 700 }}>
                Level {selectedRole.level}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                {selectedRole.permissions.length} permissions
              </p>
              {isSuperAdmin && (
                <button onClick={() => startEdit(selectedRole.id)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: selectedRole.color, color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Shield size={12} /> Edit Defaults
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {PERM_GROUPS.map(group => {
              const groupPerms = group.perms.filter(p => PERM_LABELS[p])
              return (
                <div key={group.label}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{group.label}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {groupPerms.map(perm => {
                      const has = selectedRole.permissions.includes(perm)
                      return (
                        <div key={perm}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                            borderRadius: 8,
                            background: has ? `${selectedRole.color}08` : '#f8fafc',
                            border: `1px solid ${has ? selectedRole.color + '30' : '#e2e8f0'}` }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            background: has ? selectedRole.color : '#fff',
                            border: `2px solid ${has ? selectedRole.color : '#cbd5e1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {has && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: has ? 600 : 400,
                            color: has ? '#1e293b' : '#94a3b8' }}>{PERM_LABELS[perm]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={cancelEdit}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, width:560,
            maxWidth:'95vw', maxHeight:'90vh', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid #f1f5f9',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:`${ROLE_META[editing].color}06` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Shield size={15} style={{ color: ROLE_META[editing].color }}/>
                <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#0f172a' }}>
                  Edit {ROLE_META[editing].name} Permissions
                </h3>
              </div>
              <button onClick={cancelEdit} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                <X size={16}/>
              </button>
            </div>
            <div style={{ padding:'18px 22px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:16 }}>
              {PERM_GROUPS.map(group => {
                const groupPerms = group.perms.filter(p => PERM_LABELS[p])
                return (
                  <div key={group.label}>
                    <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.08em', color:'#64748b', marginBottom:8 }}>{group.label}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {groupPerms.map(perm => {
                        const on = draft.includes(perm)
                        return (
                          <label key={perm} style={{ display:'flex', alignItems:'center', gap:10,
                            padding:'10px 12px', borderRadius:8, cursor:'pointer',
                            border:`1px solid ${on ? ROLE_META[editing].color + '40' : '#e2e8f0'}`,
                            background: on ? `${ROLE_META[editing].color}08` : '#f8fafc' }}>
                            <span style={{ width:18, height:18, borderRadius:4, flexShrink:0,
                              background: on ? ROLE_META[editing].color : '#fff',
                              border:`2px solid ${on ? ROLE_META[editing].color : '#cbd5e1'}`,
                              display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                              {on && <Check size={11} color="#fff" strokeWidth={3}/>}
                            </span>
                            <span style={{ fontSize:13, fontWeight: on ? 600 : 500, color:'#1e293b' }}>{PERM_LABELS[perm]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding:'16px 22px', borderTop:'1px solid #f1f5f9',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                <Lock size={11} style={{ verticalAlign:'middle', marginRight:4 }}/>
                {draft.length} of {Object.values(PERM_GROUPS).reduce((s,g)=>s+g.perms.filter(p=>PERM_LABELS[p]).length,0)} selected
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={cancelEdit}
                  style={{ padding:'11px 18px', borderRadius:10, fontSize:13, fontWeight:600,
                    border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  Cancel
                </button>
                <button onClick={saveRole} disabled={saving}
                  style={{ padding:'11px 18px', borderRadius:10, fontSize:13, fontWeight:700,
                    border:'none', background: saving ? '#a78bfa' : ROLE_META[editing].color, color:'#fff',
                    cursor: saving ? 'wait' : 'pointer', display:'flex', alignItems:'center', gap:6,
                    boxShadow:`0 2px 8px ${ROLE_META[editing].color}40` }}>
                  <Save size={13}/> {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
