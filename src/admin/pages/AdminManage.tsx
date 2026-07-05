import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, X, Save, Shield, Check, Trash2, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { COUNTRIES } from '../../lib/countries'
import { adminApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'
import ConfirmDialog from '../../components/ConfirmDialog'

type AdminRole = 'superadmin' | 'admin' | 'moderator' | 'support'

interface AdminMember {
  _id: string
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: AdminRole
  permissions: string[]
  status: 'active' | 'banned' | 'suspended' | string
  joinedAt: string
  lastLogin: string
}

const ROLE_CONFIG: Record<AdminRole, { label: string; color: string; bg: string; border: string; level: number }> = {
  superadmin: { label: 'Super Admin', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', level: 100 },
  admin:      { label: 'Admin',       color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', level: 80  },
  moderator:  { label: 'Moderator',   color: '#b45309', bg: '#fef3c7', border: '#fde68a', level: 60  },
  support:    { label: 'Support',     color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', level: 40  },
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: ['Full System Access', 'User Management', 'Agent Management', 'Finance Management', 'System Settings', 'Role Management', 'Announcements', 'News Feed', 'Support', 'OTP Monitor', 'Analytics', 'Withdrawals'],
  admin:      ['User Management', 'Agent Management', 'Finance Management', 'Announcements', 'News Feed', 'OTP Monitor', 'Analytics', 'Withdrawals'],
  moderator:  ['View Users', 'Ban/Unban Users', 'View Announcements', 'View Withdrawals', 'OTP Monitor'],
  support:    ['View Users', 'Handle Support Tickets', 'View Announcements'],
}

const ALL_PERMISSIONS = [
  'all_access',
  'user_manage','user_view','user_ban',
  'agent_manage','agent_view',
  'finance_manage','withdrawal_view','withdrawal_manage','commission_view',
  'announcement','announcement_view',
  'newsfeed','newsfeed_view',
  'ticket_manage','ticket_view',
  'otp_monitor','analytics','system_settings','role_manage','database_manage',
]

const DEFAULT_PERMS: Record<AdminRole, string[]> = {
  superadmin: ALL_PERMISSIONS,
  admin: ['user_manage','user_view','user_ban','agent_manage','agent_view','finance_manage','withdrawal_view','withdrawal_manage','commission_view','announcement','announcement_view','newsfeed','newsfeed_view','ticket_manage','ticket_view','otp_monitor','analytics'],
  moderator: ['user_view','user_ban','agent_view','withdrawal_view','announcement_view','newsfeed_view','ticket_view','otp_monitor'],
  support: ['user_view','ticket_manage','ticket_view','announcement_view'],
}

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
  { label: 'System', perms: ['otp_monitor','analytics','system_settings','role_manage','database_manage'] },
]

/* ── Add Admin Modal ── */
function AddAdminModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (a: AdminMember) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [country,   setCountry]   = useState('Bangladesh')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [role,      setRole]      = useState<AdminRole>('admin')
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMS['admin'])
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5,
  }

  const handleSave = async () => {
    if (!firstName || !email || !password) { setError('First name, email and password are required'); return }
    setSaving(true)
    try {
      const data = await adminApi.createStaff({
        username:  `${firstName}${lastName ? '_' + lastName : ''}`,
        email,
        password,
        role,
        permissions,
        phone: '',
        firstName,
        lastName,
      })
      onAdd(data.user)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create admin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20,
        width: 480, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.22)', overflow:'hidden' }}>

        <div style={{ padding:'18px 22px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ fontSize:17, fontWeight:800, color:'#0f172a', margin:0 }}>Add New Admin</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
            <X size={16}/>
          </button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
              padding:'9px 12px', fontSize:12, color:'#dc2626', fontWeight:600 }}>
              {error}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>FIRST NAME *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="e.g. Islam" style={inp}/>
            </div>
            <div>
              <label style={lbl}>LAST NAME</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="e.g. Mamun" style={inp}/>
            </div>
          </div>

          <div>
            <label style={lbl}>COUNTRY</label>
            <div style={{ position:'relative' }}>
              <select value={country} onChange={e => setCountry(e.target.value)}
                style={{ ...inp, paddingRight:28, appearance:'none', cursor:'pointer' }}>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                fontSize:10, color:'#94a3b8', pointerEvents:'none' }}>&#9660;</span>
            </div>
          </div>

          <div>
            <label style={lbl}>EMAIL ADDRESS *</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="admin@example.com" style={inp}/>
          </div>

          <div>
            <label style={lbl}>PASSWORD *</label>
            <div style={{ position:'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a strong password"
                style={{ ...inp, paddingRight:36 }}/>
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }}>
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          <div>
            <label style={lbl}>ROLE</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {(['admin','moderator','support'] as AdminRole[]).map(r => {
                const c = ROLE_CONFIG[r]
                return (
                  <button key={r} onClick={() => { setRole(r); setPermissions(DEFAULT_PERMS[r]) }} type="button"
                    style={{ padding:'8px 10px', borderRadius:8, cursor:'pointer', textAlign:'left',
                      background: role===r ? c.bg : '#f8fafc',
                      border: `1.5px solid ${role===r ? c.border : '#e2e8f0'}` }}>
                    <span style={{ fontSize:12, fontWeight:700, color:c.color }}>{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={lbl}>PERMISSIONS</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:200, overflowY:'auto', padding:'4px 0' }}>
              {PERM_GROUPS.map(g => (
                <div key={g.label}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{g.label}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {g.perms.map(p => {
                      const checked = permissions.includes(p)
                      return (
                        <button key={p} type="button" onClick={() => {
                          setPermissions(prev => checked ? prev.filter(x => x !== p) : [...prev, p])
                        }} style={{ padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
                          background: checked ? '#ede9fe' : '#f8fafc', color: checked ? '#7c3aed' : '#64748b',
                          border: `1px solid ${checked ? '#c4b5fd' : '#e2e8f0'}` }}>
                          {checked ? '✓ ' : ''}{PERM_LABELS[p] || p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:6, padding:'6px 0 4px' }}>
            <button onClick={onClose}
              style={{ flex:1, padding:'12px 14px', borderRadius:10, fontSize:13, fontWeight:600,
                border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer',
                transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, padding:'12px 14px', borderRadius:10, fontSize:13, fontWeight:700,
                border:'none', background:saving ? '#a78bfa' : '#7c3aed', color:'#fff',
                cursor: saving ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                boxShadow:'0 2px 8px rgba(124,58,237,0.25)' }}>
              <Plus size={13}/> {saving ? 'Adding...' : 'Add Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Edit Role Modal ── */
function EditAdminModal({ admin, onClose, onSave }: {
  admin: AdminMember; onClose: () => void; onSave: (a: AdminMember) => void
}) {
  const [role,   setRole]   = useState(admin.role)
  const [permissions, setPermissions] = useState<string[]>(admin.permissions || DEFAULT_PERMS[admin.role] || [])
  const [status, setStatus] = useState(admin.status === 'inactive' ? 'suspended' : admin.status)
  const [saved,  setSaved]  = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await adminApi.updateStaff(admin._id || admin.id || '', { role, status, permissions })
      onSave(data.user)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 700)
    } catch (err: any) {
      console.error('Update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const rc    = ROLE_CONFIG[role]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:540,
        maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.22)' }}>

        <div style={{ padding:'18px 22px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'#0f172a', margin:0 }}>
              Edit Admin — {admin.firstName} {admin.lastName}
            </h3>
            <p style={{ fontSize:12, color:'#94a3b8', margin:'3px 0 0' }}>{admin.email}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}><X size={16}/></button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:8 }}>ROLE</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {(Object.keys(ROLE_CONFIG) as AdminRole[]).map(r => {
                const c = ROLE_CONFIG[r]
                return (
                  <button key={r} onClick={()=>{ setRole(r); setPermissions(DEFAULT_PERMS[r]) }}
                    style={{ padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                      background: role===r ? c.bg : '#f8fafc',
                      border: `1.5px solid ${role===r ? c.border : '#e2e8f0'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <Shield size={13} style={{ color:c.color }}/>
                      <span style={{ fontSize:13, fontWeight:700, color:c.color }}>{c.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4,
                        background:`${c.color}15`, color:c.color, marginLeft:'auto' }}>L{c.level}</span>
                    </div>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
                      {DEFAULT_PERMS[r].length} permissions
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:8 }}>STATUS</label>
            <div style={{ display:'flex', gap:8 }}>
              {(['active','banned','suspended'] as const).map(s => (
                <button key={s} onClick={()=>setStatus(s)}
                  style={{ flex:1, padding:'9px', borderRadius:8, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', textTransform:'capitalize',
                    background: status===s?(s==='active'?'#22c55e':s==='banned'?'#ef4444':'#f59e0b'):'#f1f5f9',
                    color: status===s?'#fff':'#64748b' }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
              color:rc.color, margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
              <Shield size={11}/> {rc.label} Permissions ({permissions.length})
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {permissions.map(p => (
                <span key={p} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                  background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <Check size={9}/> {PERM_LABELS[p] || p}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:10, padding:'6px 0 4px' }}>
            <button onClick={onClose}
              style={{ flex:1, padding:'12px 14px', borderRadius:10, fontSize:13, fontWeight:600,
                border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer',
                transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, padding:'12px 14px', borderRadius:10, fontSize:13, fontWeight:700, border:'none',
                background:saved?'#22c55e':saving?'#a78bfa':'#7c3aed', color:'#fff', cursor: saving ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                boxShadow:'0 2px 8px rgba(124,58,237,0.25)' }}>
              <Save size={13}/> {saved?'Saved!':saving?'Saving...':'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminManage() {
  const [admins, setAdmins]       = useState<AdminMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [editAdmin, setEditAdmin] = useState<AdminMember | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [selected, setSelected]   = useState<AdminMember | null>(null)
  const [copiedId, setCopiedId]   = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    try {
      const data = await adminApi.listStaff()
      setAdmins(data.staff || data || [])
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'staff') fetchStaff()
    })
    return unsub
  }, [])

  const handleSave = (updated: AdminMember) => {
    setAdmins(prev => prev.map(a => (a._id || a.id) === (updated._id || updated.id) ? updated : a))
    setEditAdmin(null)
  }

  const handleAdd = (newAdmin: AdminMember) => {
    setAdmins(prev => [newAdmin, ...prev])
    setShowAdd(false)
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleteTarget(null)
    try {
      await adminApi.deleteStaff(id)
      setAdmins(prev => prev.filter(a => (a._id || a.id) !== id))
      if (selected && (selected._id || selected.id) === id) setSelected(null)
    } catch (err: any) {
      console.error('Delete failed:', err)
    }
  }

  const copyEmail = (id: string, email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {editAdmin && <EditAdminModal admin={editAdmin} onClose={()=>setEditAdmin(null)} onSave={handleSave}/>}
      {showAdd && <AddAdminModal onClose={()=>setShowAdd(false)} onAdd={handleAdd}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#0f172a', margin:0 }}>Admin Management</h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>
            {admins.filter(a=>a.status==='active').length} active admins · {admins.length} total
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchStaff}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10,
              fontSize:13, fontWeight:600, border:'1px solid #e2e8f0', background:'#fff',
              color:'#475569', cursor:'pointer' }}>
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={()=>setShowAdd(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10,
              fontSize:13, fontWeight:700, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer' }}>
            <Plus size={14}/> Add Admin
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20 }}>

        {/* Admins Table */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'auto' }}>
          {loading ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
              Loading staff...
            </div>
          ) : (
            <table style={{ width:'100%', minWidth:700, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                  {['Admin','Role','Status','Joined','Last Login','Actions'].map(h=>(
                    <th key={h} style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.06em', color:'#94a3b8', padding:'10px 16px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map(admin=>{
                  const rc = ROLE_CONFIG[admin.role] || ROLE_CONFIG.admin
    const aid = admin._id || admin.id || ''
    const isSuperadmin = admin.role === 'superadmin'
                  return (
                    <tr key={aid}
                      onClick={()=>setSelected(selected && (selected._id || selected.id)===aid ? null : admin)}
                      style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer',
                        background: selected && (selected._id || selected.id)===aid ? '#faf5ff' : 'transparent' }}
                      className="hover:bg-slate-50 transition-colors">
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                            background:`linear-gradient(135deg,${rc.color},${rc.color}99)`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:14, fontWeight:800, color:'#fff' }}>
                            {(admin.firstName || admin.email || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>
                              {admin.firstName} {admin.lastName}
                            </p>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <p style={{ fontSize:11, color:'#94a3b8', margin:0, fontFamily:'monospace' }}>{admin.email}</p>
                              <button onClick={e=>{e.stopPropagation();copyEmail(aid || '', admin.email)}}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'1px 3px' }}>
                                {copiedId===aid ? <Check size={9} style={{color:'#22c55e'}}/> : <Copy size={9}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                          background:rc.bg, color:rc.color, border:`1px solid ${rc.border}` }}>
                          {rc.label}
                        </span>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, textTransform:'uppercase',
                          background:admin.status==='active'?'#dcfce7':'#f1f5f9',
                          color:admin.status==='active'?'#16a34a':'#94a3b8' }}>
                          {admin.status}
                        </span>
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#94a3b8' }}>
                        {admin.joinedAt ? new Date(admin.joinedAt).toLocaleDateString('en-GB', { month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#94a3b8' }}>
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString('en-GB', { month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setEditAdmin(admin)}
                            style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px',
                              borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #e2e8f0',
                              background:'#fff', color:'#475569', cursor:'pointer' }}>
                            <Edit2 size={12}/> Edit
                          </button>
                          {!isSuperadmin && (
                            <button onClick={()=>setDeleteTarget(aid)}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid #fee2e2',
                                background:'#fff', cursor:'pointer', display:'flex', alignItems:'center',
                                justifyContent:'center', color:'#ef4444' }}>
                              <Trash2 size={13}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Permissions panel */}
        {selected && (() => {
          const rc = ROLE_CONFIG[selected.role] || ROLE_CONFIG.admin
          const perms = ROLE_PERMISSIONS[selected.role] || []
          return (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', alignSelf:'start' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9',
                background:`${rc.color}06`,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Shield size={14} style={{ color:rc.color }}/>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>
                    {selected.firstName}'s Permissions
                  </h3>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                  <X size={14}/>
                </button>
              </div>
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20,
                    background:rc.bg, color:rc.color, border:`1px solid ${rc.border}` }}>
                    {rc.label} · Level {rc.level}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {perms.map(p => (
                    <div key={p} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                      borderRadius:8, background:`${rc.color}06`, border:`1px solid ${rc.border}50` }}>
                      <div style={{ width:16, height:16, borderRadius:4, background:rc.color,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Check size={9} color="#fff" strokeWidth={3}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{p}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setEditAdmin(selected)}
                  style={{ width:'100%', marginTop:14, padding:'10px', borderRadius:10, fontSize:13,
                    fontWeight:700, border:'none', background:'#7c3aed', color:'#fff', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Edit2 size={13}/> Change Role
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Admin?"
        message="This admin/moderator/support account will be permanently removed. They will lose access immediately."
        confirmLabel="Yes, Delete Admin"
        cancelLabel="Cancel"
        confirmColor="#ef4444"
        onConfirm={() => { if (deleteTarget) return handleDelete(deleteTarget) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
