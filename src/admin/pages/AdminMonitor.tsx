import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Search, Copy, Check, Pause, Play, AlertCircle, X } from 'lucide-react'
import { otpsApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

function pad(n: number) { return String(n).padStart(2,'0') }
function fmtTime(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }

/** Mask OTP code in message */
function maskOTP(msg: string, otp?: string): string {
  if (!msg) return '—'
  if (otp && msg.includes(otp)) return msg.replace(otp, '***')
  return msg.replace(/\b\d{4,8}\b/g, '***')
}



const APP_COLORS = ['#6366f1','#a78bfa','#fbbf24','#10b981','#f97316','#3b82f6','#ec4899','#14b8a6']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0',
        background: copied ? '#dcfce7' : '#fff', color: copied ? '#16a34a' : '#7c3aed', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, transition: 'all 0.15s' }}>
      {copied ? <Check size={10}/> : <Copy size={10}/>}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function RangeBadge({ range }: { range: string }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  return (
    <span onClick={() => { navigator.clipboard.writeText(range); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontFamily: 'monospace', fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
        background: copied ? '#dcfce7' : hovered ? '#ede9fe' : '#f5f3ff',
        color: copied ? '#16a34a' : '#7c3aed', border: `1px solid ${copied ? '#86efac' : '#ddd6fe'}`,
        userSelect: 'none', transition: 'all 0.15s' }}>
      {copied ? <Check size={9}/> : <Copy size={9}/>}
      {range}
      {hovered && !copied && (
        <span style={{ position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px',
          borderRadius: 5, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>Click to copy</span>
      )}
    </span>
  )
}

function PauseConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 380, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={22} style={{ color: '#f59e0b' }}/>
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Pause Live Feed?</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>New OTP logs will stop streaming</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }}><X size={16}/></button>
        </div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
          The live OTP monitor will be paused. Existing logs will remain visible. Resume at any time.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Pause size={13}/> Yes, Pause
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminMonitor() {
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [paused, setPaused] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  const fetchLogs = async () => {
    try {
      // All data from DB only — no localStorage
      let data: any[] = []
      try {
        const res = await otpsApi.live()
        data = res?.logs || res || []
      } catch {
        const res = await otpsApi.list({ limit: 200 }).catch(() => ({ logs: [] }))
        data = (res?.logs || []).filter((l: any) => l.status === 'success')
      }

      setLogs(data.map((l: any) => ({
        id: l._id || l.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: l.createdAt ? fmtTime(new Date(l.createdAt)) : '--:--:--',
        operator: l.operator || '—',
        country: { flag: l.countryFlag || '🌍', name: l.country || '—' },
        service: l.service || '—',
        range: l.number ? l.number.slice(0, -3) + 'XXX' : '—',
        username: l.username || l.userId || '—',
        otp: l.otp || '',
        msg: maskOTP(l.otp ? `→ <#> *** is your ${l.service} code` : (l.message || '—'), l.otp),
      })))
    } catch (err) {
      console.error('OTP live fetch error:', err)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'otps') fetchLogs()
    })
    return unsub
  }, [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => { if (!pausedRef.current) fetchLogs() }, 5000)
    return () => clearInterval(t)
  }, [paused])

  const filtered = filter ? logs.filter(l =>
    l.service.toLowerCase().includes(filter.toLowerCase()) ||
    l.username.toLowerCase().includes(filter.toLowerCase()) ||
    l.range.includes(filter)
  ) : logs

  const serviceCounts: Record<string, number> = {}
  logs.forEach(l => { serviceCounts[l.service] = (serviceCounts[l.service] || 0) + 1 })
  const topServices = Object.entries(serviceCounts).sort((a,b) => b[1]-a[1]).slice(0,5)

  const rangeCounts: Record<string, number> = {}
  logs.forEach(l => { rangeCounts[l.range] = (rangeCounts[l.range] || 0) + 1 })
  const topRanges = Object.entries(rangeCounts).sort((a,b) => b[1]-a[1]).slice(0,5)

  const handleCopyReport = () => {
    const svcStr = topServices.map(([s,c]) => `${s}(${c})`).join(', ')
    const rngStr = topRanges.map(([r,c]) => `${r}(${c})`).join(', ')
    navigator.clipboard.writeText(`🔝 TOP SERVICES: ${svcStr}\n📡 TOP RANGES: ${rngStr}`)
    setReportCopied(true); setTimeout(() => setReportCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showPauseModal && <PauseConfirmModal onConfirm={() => { setPaused(true); setShowPauseModal(false) }} onCancel={() => setShowPauseModal(false)}/>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>OTP Monitor</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Live platform-wide OTP feed — real data</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleCopyReport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: '1px solid #e2e8f0', background: reportCopied ? '#dcfce7' : '#fff', color: reportCopied ? '#16a34a' : '#7c3aed', cursor: 'pointer' }}>
            {reportCopied ? <Check size={13}/> : <Copy size={13}/>} {reportCopied ? 'Copied!' : 'Copy Report'}
          </button>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
            <input placeholder="Filter by service, user, range..." value={filter} onChange={e=>setFilter(e.target.value)}
              style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', width: 240 }}/>
          </div>
          <button onClick={() => paused ? setPaused(false) : setShowPauseModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: '1px solid #e2e8f0', background: paused ? '#7c3aed' : '#fff', color: paused ? '#fff' : '#475569', cursor: 'pointer' }}>
            {paused ? <><Play size={13}/> Resume</> : <><Pause size={13}/> Pause</>}
          </button>
        </div>
      </div>

      {/* Top Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Top 5 Services</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Click to copy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topServices.length === 0 ? <p style={{ fontSize: 13, color: '#94a3b8' }}>No data yet</p> :
              topServices.map(([svc, count], i) => (
                <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', width: 18, textAlign: 'right', flexShrink: 0 }}>#{i+1}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#7c3aed', width: `${(count / (topServices[0]?.[1] || 1)) * 100}%` }}/>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', minWidth: 80, whiteSpace: 'nowrap' }}>{svc}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', minWidth: 28, textAlign: 'right' }}>{count}</span>
                  </div>
                  <CopyButton text={svc}/>
                </div>
              ))
            }
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Top 5 Ranges</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Click to copy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topRanges.length === 0 ? <p style={{ fontSize: 13, color: '#94a3b8' }}>No data yet</p> :
              topRanges.map(([rng, count], i) => (
                <div key={rng} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', width: 18, textAlign: 'right', flexShrink: 0 }}>#{i+1}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#0ea5e9', width: `${(count / (topRanges[0]?.[1] || 1)) * 100}%` }}/>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 90, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{rng}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', minWidth: 28, textAlign: 'right' }}>{count}</span>
                  </div>
                  <CopyButton text={rng}/>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 160px 130px 130px 100px 1fr',
          padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', gap: 12, minWidth: 820 }}>
          {['TIME','OPERATOR','COUNTRY','SERVICE','RANGE','USER','SMS'].map(h=>(
            <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading OTP logs...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No OTP logs yet. Logs will appear here as users receive OTPs.</div>
          ) : filtered.map((log, i) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '70px 100px 160px 130px 130px 100px 1fr',
              padding: '12px 20px', borderBottom: '1px solid #f8fafc', gap: 12, alignItems: 'center', minWidth: 820,
              borderLeft: '3px solid transparent', transition: 'all 0.12s' }}
              className="hover:bg-slate-50"
              onMouseEnter={e=>(e.currentTarget.style.borderLeftColor=APP_COLORS[i%APP_COLORS.length])}
              onMouseLeave={e=>(e.currentTarget.style.borderLeftColor='transparent')}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', whiteSpace: 'nowrap' }}>{log.ts}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: '#e0f2fe', color: '#0369a1', display: 'inline-block', whiteSpace: 'nowrap' }}>{log.operator}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{log.country.flag} {log.country.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{log.service}</span>
              <RangeBadge range={log.range}/>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#f3e8ff', color: '#7c3aed' }}>{log.username}</span>
              <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.msg}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Showing {filtered.length} logs · Auto-refreshes every 5s</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: paused ? '#94a3b8' : '#22c55e', display: 'inline-block' }}/>
            <span style={{ fontSize: 12, color: paused ? '#94a3b8' : '#16a34a', fontWeight: 600 }}>{paused ? 'PAUSED' : 'LIVE'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
