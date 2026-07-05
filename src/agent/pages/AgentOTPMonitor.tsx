import { useState, useEffect, useRef } from 'react'
import { Search, Copy, Check, Pause, Play, AlertCircle, X } from 'lucide-react'
import { otpsApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { onOTPLive, onOTPReceived } from '../../lib/socket'

/** Mask OTP code in message */
function maskOTP(msg: string, otp?: string): string {
  if (!msg) return '—'
  if (otp && msg.includes(otp)) return msg.replace(otp, '***')
  return msg.replace(/\b\d{4,8}\b/g, '***')
}

function pad(n: number) { return String(n).padStart(2,'0') }
function fmtTime(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }


function RangeBadge({ range }: { range: string }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const handleClick = () => { navigator.clipboard.writeText(range); setCopied(true); setTimeout(()=>setCopied(false),1500) }
  return (
    <span onClick={handleClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontFamily:'monospace', fontWeight:600,
        padding:'3px 8px', borderRadius:6, cursor:'pointer', background:copied?'#dcfce7':hovered?'#ede9fe':'#f5f3ff',
        color:copied?'#16a34a':'#7c3aed', border:`1px solid ${copied?'#86efac':'#ddd6fe'}`, userSelect:'none', transition:'all 0.15s' }}>
      {copied?<Check size={9}/>:<Copy size={9}/>}{range}
    </span>
  )
}

function PauseModal({ onConfirm, onCancel }: { onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18, width:360, padding:'24px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertCircle size={20} style={{ color:'#f59e0b' }}/>
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0 }}>Pause Live Feed?</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'2px 0 0' }}>New OTP logs will stop streaming</p>
          </div>
          <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}><X size={15}/></button>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'9px', borderRadius:9, fontSize:13, fontWeight:600, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'9px', borderRadius:9, fontSize:13, fontWeight:700, border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Pause size={12}/> Yes, Pause
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgentOTPMonitor() {
  const { user } = useAuth()
  const [logs, setLogs]             = useState<any[]>([])
  const [filter, setFilter]         = useState('')
  const [paused, setPaused]         = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  const fetchLogs = async () => {
    try {
      const res = await otpsApi.list({ limit: 200 }).catch(() => ({ logs: [] }))
      // All data from DB only — no localStorage
      const data: any[] = (res?.logs || []).filter((l: any) => l.status === 'success')

      const agentFiltered = user?.role === 'agent'
        ? data.filter((l: any) => !l.agentId || l.agentId === (user?._id || user?.id))
        : data

      setLogs(agentFiltered.map((l: any) => ({
        id: l._id || l.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: l.createdAt ? fmtTime(new Date(l.createdAt)) : '--:--:--',
        operator: l.operator || '—',
        country: { flag: l.countryFlag || '🌍', name: l.country || '—' },
        service: l.service || '—',
        range: l.number ? l.number.slice(0, -3) + 'XXX' : '—',
        msg: maskOTP(l.otp ? `→ <#> *** is your ${l.service} code` : (l.message || '—'), l.otp),
      })))
    } catch (err) {
      console.error('OTP fetch error:', err)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  // Realtime: socket pushes new OTP events instantly (no polling needed)
  useEffect(() => {
    const unsubLive = onOTPLive(() => { if (!pausedRef.current) fetchLogs() })
    const unsubRecv = onOTPReceived(() => { if (!pausedRef.current) fetchLogs() })
    return () => { unsubLive(); unsubRecv() }
  }, [])

  // Backup polling every 15s in case socket disconnects (was 5s — reduced since socket is primary)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => { if (!pausedRef.current) fetchLogs() }, 15000)
    return () => clearInterval(t)
  }, [paused])

  const filtered = filter ? logs.filter(l =>
    l.service.toLowerCase().includes(filter.toLowerCase()) || l.range.includes(filter)
  ) : logs

  const svcCounts: Record<string,number> = {}
  logs.forEach(l=>{ svcCounts[l.service]=(svcCounts[l.service]||0)+1 })
  const topServices = Object.entries(svcCounts).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const rngCounts: Record<string,number> = {}
  logs.forEach(l=>{ rngCounts[l.range]=(rngCounts[l.range]||0)+1 })
  const topRanges = Object.entries(rngCounts).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const copyReport = () => {
    const s = topServices.map(([s,c])=>`${s}(${c})`).join(', ')
    const r = topRanges.map(([r,c])=>`${r}(${c})`).join(', ')
    navigator.clipboard.writeText(`🔝 TOP SERVICES: ${s}\n📡 TOP RANGES: ${r}`)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {showPauseModal && <PauseModal onConfirm={()=>{setPaused(true);setShowPauseModal(false)}} onCancel={()=>setShowPauseModal(false)}/>}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#0f172a', margin:0 }}>OTP Monitor</h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Live OTP feed — real data, auto-refreshes every 5s</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={copyReport} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, fontSize:13, fontWeight:600,
            border:'1px solid #e2e8f0', background:copied?'#dcfce7':'#fff', color:copied?'#16a34a':'#6366f1', cursor:'pointer' }}>
            {copied?<Check size={12}/>:<Copy size={12}/>} {copied?'Copied!':'Copy Report'}
          </button>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input placeholder="Filter..." value={filter} onChange={e=>setFilter(e.target.value)}
              style={{ paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8, fontSize:13, borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#1e293b', outline:'none', width:200 }}/>
          </div>
          <button onClick={()=>paused?setPaused(false):setShowPauseModal(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:600,
              border:'1px solid #e2e8f0', background:paused?'#6366f1':'#fff', color:paused?'#fff':'#475569', cursor:'pointer' }}>
            {paused?<><Play size={12}/> Resume</>:<><Pause size={12}/> Pause</>}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:'16px 20px' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Top 5 Services</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topServices.length === 0 ? <p style={{ fontSize:13, color:'#94a3b8' }}>No data yet</p> :
              topServices.map(([svc,count],i)=>(
                <div key={svc} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#94a3b8', width:18, textAlign:'right', flexShrink:0 }}>#{i+1}</span>
                  <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                    <div style={{ height:'100%', borderRadius:3, background:'#6366f1', width:`${(count/(topServices[0]?.[1]||1))*100}%` }}/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'#1e293b', minWidth:80 }}>{svc}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#6366f1', minWidth:28, textAlign:'right' }}>{count}</span>
                </div>
              ))
            }
          </div>
        </div>
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:'16px 20px' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Top 5 Ranges</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topRanges.length === 0 ? <p style={{ fontSize:13, color:'#94a3b8' }}>No data yet</p> :
              topRanges.map(([rng,count],i)=>(
                <div key={rng} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#94a3b8', width:18, textAlign:'right', flexShrink:0 }}>#{i+1}</span>
                  <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                    <div style={{ height:'100%', borderRadius:3, background:'#0ea5e9', width:`${(count/(topRanges[0]?.[1]||1))*100}%` }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#1e293b', minWidth:90, fontFamily:'monospace' }}>{rng}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0ea5e9', minWidth:28, textAlign:'right' }}>{count}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'70px 100px 160px 130px 130px 1fr',
          padding:'8px 20px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', gap:12, minWidth:750 }}>
          {['TIME','OPERATOR','COUNTRY','SERVICE','RANGE','SMS'].map(h=>(
            <span key={h} style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight:420, overflowY:'auto' }}>
          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading OTP logs...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No OTP logs yet.</div>
          ) : filtered.map((log)=>(
            <div key={log.id} style={{ display:'grid', gridTemplateColumns:'70px 100px 160px 130px 130px 1fr',
              padding:'10px 20px', borderBottom:'1px solid #f8fafc', gap:12, alignItems:'center', minWidth:750 }}
              className="hover:bg-slate-50">
              <span style={{ fontSize:11, fontFamily:'monospace', color:'#94a3b8' }}>{log.ts}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:5, background:'#e0f2fe', color:'#0369a1', display:'inline-block' }}>{log.operator}</span>
              <span style={{ fontSize:12, color:'#475569' }}>{log.country.flag} {log.country.name}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#6366f1' }}>{log.service}</span>
              <RangeBadge range={log.range}/>
              <span style={{ fontSize:12, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.msg}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 20px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', background:'#f8fafc' }}>
          <span style={{ fontSize:12, color:'#94a3b8' }}>Showing {filtered.length} logs · Auto-refreshes every 5s</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:paused?'#94a3b8':'#22c55e', display:'inline-block' }}/>
            <span style={{ fontSize:12, color:paused?'#94a3b8':'#16a34a', fontWeight:600 }}>{paused?'PAUSED':'LIVE'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
