import { useState } from 'react'
import { Wifi, Monitor, Ban, Check, Shield, AlertTriangle, Cpu } from 'lucide-react'
import { LoginSession } from '../data/types'

interface Props {
  sessions: LoginSession[]
  onUpdate: (sessions: LoginSession[]) => void
}

export default function SecurityTab({ sessions, onUpdate }: Props) {
  const banIP  = (idx: number) => onUpdate(sessions.map((s,i)=>i===idx?{...s,ipBanned:!s.ipBanned}:s))
  const banMAC = (idx: number) => onUpdate(sessions.map((s,i)=>i===idx?{...s,macBanned:!s.macBanned}:s))
  const remove = (idx: number) => onUpdate(sessions.filter((_,i)=>i!==idx))

  const hasBanned = sessions.some(s=>s.ipBanned||s.macBanned)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Legend */}
      <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid #e2e8f0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <Shield size={13} style={{ color:'#6366f1' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>IP & Device Security</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:11, color:'#64748b', lineHeight:1.6 }}>
          <span>• <strong>Ban IP</strong> — Blocks logins from this IP address. User can bypass by changing IP.</span>
          <span>• <strong>Ban MAC</strong> — Blocks the physical device. Cannot be bypassed by changing IP.</span>
          <span>• <strong>Remove</strong> — Clears this session record (e.g. after unbanning).</span>
        </div>
      </div>

      {hasBanned && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:9,
          background:'#fef3c7', border:'1px solid #fde68a' }}>
          <AlertTriangle size={13} style={{ color:'#f59e0b' }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'#92400e' }}>
            This user has active IP or MAC bans
          </span>
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={{ textAlign:'center', padding:'28px', color:'#94a3b8', background:'#f8fafc',
          borderRadius:10, border:'1px dashed #e2e8f0' }}>
          <Monitor size={28} style={{ margin:'0 auto 8px', opacity:0.3 }}/>
          <p style={{ fontSize:12, margin:0 }}>No login sessions recorded</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {sessions.map((s, idx) => (
            <div key={idx} style={{ borderRadius:12, border:`1px solid ${s.macBanned||s.ipBanned?'#fca5a5':'#e2e8f0'}`,
              overflow:'hidden', background:s.macBanned||s.ipBanned?'#fff7f7':'#fff' }}>

              {/* Session header */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9',
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'#ede9fe',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Monitor size={15} style={{ color:'#7c3aed' }}/>
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>{s.device}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>Logged in: {s.loginAt}</p>
                  </div>
                </div>
                {(s.ipBanned || s.macBanned) && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background:'#fee2e2', color:'#dc2626' }}>
                    ⛔ BANNED
                  </span>
                )}
              </div>

              {/* IP row */}
              <div style={{ padding:'10px 14px', borderBottom:'1px solid #f8fafc',
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Wifi size={12} style={{ color:'#0ea5e9', flexShrink:0 }}/>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.06em', color:'#94a3b8', display:'block' }}>IP Address</span>
                    <code style={{ fontSize:13, fontFamily:'monospace', fontWeight:700, color:'#1e293b' }}>
                      {s.ip}
                    </code>
                  </div>
                  {s.ipBanned && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10,
                      background:'#fee2e2', color:'#dc2626' }}>BANNED</span>
                  )}
                </div>
                <button onClick={() => banIP(idx)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:8,
                    fontSize:11, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.15s',
                    background: s.ipBanned ? '#dcfce7' : '#fee2e2',
                    color: s.ipBanned ? '#16a34a' : '#dc2626' }}>
                  {s.ipBanned ? <><Check size={10}/> Unban IP</> : <><Ban size={10}/> Ban IP</>}
                </button>
              </div>

              {/* MAC row */}
              <div style={{ padding:'10px 14px', borderBottom:'1px solid #f8fafc',
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Cpu size={12} style={{ color:'#f59e0b', flexShrink:0 }}/>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.06em', color:'#94a3b8', display:'block' }}>MAC Address</span>
                    <code style={{ fontSize:13, fontFamily:'monospace', fontWeight:700, color:'#1e293b' }}>
                      {s.mac}
                    </code>
                  </div>
                  {s.macBanned && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10,
                      background:'#fee2e2', color:'#dc2626' }}>BANNED</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => banMAC(idx)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:8,
                      fontSize:11, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.15s',
                      background: s.macBanned ? '#dcfce7' : '#fef3c7',
                      color: s.macBanned ? '#16a34a' : '#b45309' }}>
                    {s.macBanned ? <><Check size={10}/> Unban MAC</> : <><Ban size={10}/> Ban MAC</>}
                  </button>
                  <button onClick={() => remove(idx)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8,
                      fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid #e2e8f0',
                      background:'#fff', color:'#94a3b8' }}>
                    Remove
                  </button>
                </div>
              </div>

              {/* Browser info */}
              <div style={{ padding:'8px 14px', background:'#f8fafc' }}>
                <span style={{ fontSize:11, color:'#94a3b8' }}>Browser: {s.browser}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
