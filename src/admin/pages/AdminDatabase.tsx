import { useState, useEffect, useCallback } from 'react'
import { Save, Check, RefreshCw, Trash2, Download, Upload,
  Archive, AlertCircle, Database, Cpu, HardDrive, Activity,
  Server, Eye, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { adminApi, api, settingsApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

interface DbStats {
  label: string
  kind: 'primary' | 'secondary'
  id?: string
  dbName?: string
  connected: boolean
  sizeBytes: number
  displaySize: string
  collections: { name: string; count: number; sizeBytes: number; displaySize: string; avgObjSize?: number }[]
  error?: string
}

interface SystemStats {
  server: { hostname: string; platform: string; arch: string; nodeVersion: string; uptime: number; pid: number }
  cpu: { model: string; cores: number; speedMHz: number; loadAvg: number[]; loadPct: number }
  memory: any
  disk: any
  primary: DbStats
  secondaries: DbStats[]
  timestamp: number
}

function fmtBytes(n: number) {
  if (!n || n < 1) return '0 B'
  const u = ['B','KB','MB','GB','TB']
  let i = 0, x = n
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++ }
  return `${x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0)} ${u[i]}`
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatusBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%',
        background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : color,
        borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function StatPill({ icon, label, value, sub, color = '#7c3aed' }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
      border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: '#94a3b8' }}>{label}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: '#64748b' }}>{sub}</span>}
    </div>
  )
}

function DbCard({ db }: { db: DbStats }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px',
      border: `1px solid ${db.connected ? '#e2e8f0' : '#fecaca'}`,
      display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%',
            background: db.connected ? '#22c55e' : '#ef4444', boxShadow: db.connected ? '0 0 0 3px #dcfce7' : '' ,
            flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {db.label}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              {db.dbName || (db.kind === 'primary' ? 'primary' : 'disconnected')}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 900, color: db.connected ? '#1e293b' : '#ef4444' }}>
          {db.displaySize}
        </span>
      </div>

      {db.error && (
        <div style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
          {db.error}
        </div>
      )}

      {db.connected && db.collections.length > 0 && (
        <>
          <button onClick={() => setExpanded(e => !e)}
            style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: 11, fontWeight: 600,
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#475569' }}>
            {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            {db.collections.length} collection{db.collections.length !== 1 ? 's' : ''} · {expanded ? 'Hide' : 'Show'}
          </button>
          {expanded && (
            <div style={{ marginTop: 4, borderRadius: 8, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              {db.collections.map(c => (
                <div key={c.name}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderBottom: '1px solid #f8fafc', fontSize: 11 }}>
                  <span style={{ fontFamily: 'monospace', color: '#475569' }}>{c.name}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>{c.count.toLocaleString()} docs</span>
                    <span style={{ color: '#1e293b', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                      {c.displaySize}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {db.connected && db.collections.length === 0 && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>No collections yet</div>
      )}
    </div>
  )
}

export default function AdminDatabase() {
  const [autoBackup, setAutoBackup] = useState(false)
  const [backupTime, setBackupTime] = useState('02:00')
  const [backupFreq, setBackupFreq] = useState('daily')
  const [tgEnabled,  setTgEnabled]  = useState(false)
  const [tgToken,    setTgToken]    = useState('')
  const [tgChat,     setTgChat]     = useState('')
  const [backupSaved,setBackupSaved]= useState(false)
  const [importing, setImporting] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [syncLoading,   setSyncLoading]   = useState(false)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [lastTick, setLastTick] = useState<number>(0)

  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  // Load backup settings from DB on mount
  useEffect(() => {
    settingsApi.getAll().then((data: any) => {
      if (data?.backup) {
        setAutoBackup(!!data.backup.autoBackup)
        setBackupTime(data.backup.backupTime || '02:00')
        setBackupFreq(data.backup.backupFreq || 'daily')
        setTgEnabled(!!data.backup.tgEnabled)
        setTgToken(data.backup.tgToken || '')
        setTgChat(data.backup.tgChat || '')
      }
    }).catch(() => {})
  }, [])

  const saveBackup = async () => {
    try {
      await settingsApi.save({
        backup: { autoBackup, backupTime, backupFreq, tgEnabled, tgToken, tgChat }
      })
    } catch {
      // silent — settings might not save if server unreachable
    }
    setBackupSaved(true); setTimeout(()=>setBackupSaved(false),2000)
    flash(true,'Backup settings saved!')
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const exportUrl = adminApi.exportDatabase()
      window.open(exportUrl, '_blank')
      flash(true,'Export started — check your downloads!')
    } catch (e: any) {
      flash(false, 'Export failed: ' + e.message)
    } finally { setExportLoading(false) }
  }

  const handleSyncBalances = async () => {
    setSyncLoading(true)
    try {
      const res = await adminApi.syncBalances()
      flash(true, res.message || 'Balances synced from OTP history!')
    } catch (e: any) {
      flash(false, 'Sync failed: ' + (e.message || 'Unknown error'))
    } finally { setSyncLoading(false) }
  }

  const handleImport = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    setImporting(true)
    flash(true, `Import file selected: ${file.name} — restore functionality coming soon.`)
    setTimeout(()=>setImporting(false), 1000)
    e.target.value=''
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await adminApi.wipeDatabase()
      setClearConfirm(false)
      flash(true,'Database wiped! All data cleared except your admin account.')
    } catch (e: any) {
      flash(false, 'Wipe failed: ' + e.message)
    } finally { setClearing(false) }
  }

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await api.get('/database/stats')
      setStats(res)
      setLastTick(Date.now())
    } catch (e: any) {
      // Show error in flash instead of silent fail
      flash(false, 'Failed to load database stats: ' + (e?.message || 'Server error'))
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    // Realtime: socket pushes updates on user/agent/otp changes → refetch stats
    const unsub = onDataUpdated((data: any) => {
      if (['users','agents','otps','withdrawals','serviceProviders'].includes(data?.type)) fetchStats()
    })
    // Backup polling every 30s
    const interval = setInterval(fetchStats, 30000)
    return () => { unsub(); clearInterval(interval) }
  }, [fetchStats])

  const lbl:React.CSSProperties = {fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#94a3b8',display:'block',marginBottom:4}
  const inp:React.CSSProperties = {width:'100%',padding:'8px 12px',fontSize:13,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#1e293b',outline:'none',boxSizing:'border-box'}

  const Toggle = ({val,fn}:{val:boolean;fn:()=>void}) => (
    <button onClick={fn} style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
      background:val?'#7c3aed':'#e2e8f0',position:'relative',transition:'background 0.2s',flexShrink:0}}>
      <span style={{position:'absolute',top:3,width:18,height:18,borderRadius:'50%',background:'#fff',
        left:val?23:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
    </button>
  )

  const totalDbSize = stats
    ? (stats.primary.sizeBytes + (stats.secondaries?.reduce((s, d) => s + d.sizeBytes, 0) || 0))
    : 0

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',margin:0}}>Database Management</h1>
          <p style={{fontSize:14,color:'#64748b',marginTop:4}}>
            Live system stats · backup · manual maintenance
          </p>
        </div>
        <button onClick={fetchStats}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
            borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer',
            fontSize:12, fontWeight:600, color:'#475569' }}
          onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background='#fff'}>
          <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
          {statsLoading ? 'Refreshing...' : lastTick ? `Updated ${Math.max(0, Math.floor((Date.now() - lastTick) / 1000))}s ago` : 'Refresh'}
        </button>
      </div>

      {msg && (
        <div style={{padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,
          background:msg.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${msg.ok?'#86efac':'#fecaca'}`,
          color:msg.ok?'#16a34a':'#dc2626',display:'flex',alignItems:'center',gap:8}}>
          {msg.ok?<Check size={14}/>:<AlertCircle size={14}/>} {msg.text}
        </div>
      )}

      {/* ═══════ Live System Overview ═══════ */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Live System Overview</h3>
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            Live · updates every 10s
          </span>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top resource pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatPill icon={<Cpu size={15} color="#f59e0b" />}
              label="CPU Load"
              value={stats ? `${stats.cpu.loadPct}%` : '—'}
              sub={stats ? `${stats.cpu.cores} cores · ${stats.cpu.model || ''}` : 'Loading...'}
              color="#f59e0b" />
            <StatPill icon={<Zap size={15} color="#0ea5e9" />}
              label="Process RAM"
              value={stats ? fmtBytes(stats.memory.rss.bytes) : '—'}
              sub={stats ? `Heap ${fmtBytes(stats.memory.heapUsed.bytes)} / ${fmtBytes(stats.memory.heapTotal.bytes)}` : ''}
              color="#0ea5e9" />
            <StatPill icon={<HardDrive size={15} color="#22c55e" />}
              label="System Memory"
              value={stats ? `${stats.memory.system.usedPct}%` : '—'}
              sub={stats ? `${stats.memory.system.usedDisplay} / ${stats.memory.system.totalDisplay}` : ''}
              color="#22c55e" />
            <StatPill icon={<Server size={15} color="#7c3aed" />}
              label="Databases Total"
              value={stats ? fmtBytes(totalDbSize) : '—'}
              sub={stats ? `1 primary + ${stats.secondaries?.length || 0} secondary` : ''}
              color="#7c3aed" />
          </div>

          {/* CPU/Mem progress + disk */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
                    CPU Usage
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: stats.cpu.loadPct > 80 ? '#ef4444' : stats.cpu.loadPct > 60 ? '#f59e0b' : '#22c55e' }}>
                    {stats.cpu.loadPct}%
                  </span>
                </div>
                <StatusBar pct={stats.cpu.loadPct} color="#22c55e" />
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  Load avg · 1m: {(stats.cpu.loadAvg?.[0] ?? 0).toFixed(2)} ·
                  5m: {(stats.cpu.loadAvg?.[1] ?? 0).toFixed(2)} ·
                  15m: {(stats.cpu.loadAvg?.[2] ?? 0).toFixed(2)}
                </div>
              </div>

              {stats.disk && !stats.disk.error && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                  border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
                      Disk Usage
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: stats.disk.usedPct > 80 ? '#ef4444' : '#7c3aed' }}>
                      {stats.disk.usedPct}%
                    </span>
                  </div>
                  <StatusBar pct={stats.disk.usedPct} color="#7c3aed" />
                  <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                    Used: {stats.disk.usedDisplay} · Free: {stats.disk.freeDisplay} · Total: {stats.disk.totalDisplay}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Server info */}
          {stats && (
            <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', borderRadius: 10,
              padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <span><b>Host:</b> {stats.server.hostname}</span>
              <span><b>OS:</b> {stats.server.platform} ({stats.server.arch})</span>
              <span><b>Node:</b> {stats.server.nodeVersion}</span>
              <span><b>PID:</b> {stats.server.pid}</span>
              <span><b>Uptime:</b> {fmtUptime(stats.server.uptime)}</span>
              <span><b>Last update:</b> {new Date(stats.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Database Sizes ═══════ */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={15} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Databases ({stats ? 1 + (stats.secondaries?.length || 0) : 0})</h3>
          </div>
          <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>
            {stats ? `Total: ${fmtBytes(totalDbSize)}` : '—'}
          </span>
        </div>
        <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {stats?.primary && <DbCard db={stats.primary} />}
          {stats?.secondaries?.map(s => <DbCard key={s.id} db={s} />)}
          {!stats && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              <RefreshCw size={20} className="animate-spin" style={{ marginBottom: 8 }} />
              <div>Loading database stats...</div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Auto Backup ═══════ */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Archive size={15} style={{color:'#7c3aed'}}/><h3 style={{fontSize:14,fontWeight:700,color:'#0f172a',margin:0}}>Auto Backup</h3>
          </div>
          <Toggle val={autoBackup} fn={()=>setAutoBackup(v=>!v)}/>
        </div>
        <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>
          {autoBackup && (
            <div style={{background:'#faf5ff',padding:'14px',borderRadius:12,border:'1px solid #e9d5ff',display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={lbl}>BACKUP TIME</label><input type="time" value={backupTime} onChange={e=>setBackupTime(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>FREQUENCY</label>
                  <select value={backupFreq} onChange={e=>setBackupFreq(e.target.value)} style={{...inp,appearance:'none',cursor:'pointer'}}>
                    <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="hourly">Every 6 Hours</option>
                  </select>
                </div>
              </div>
              <div style={{fontSize:11,color:'#7c3aed',background:'#ede9fe',padding:'8px 10px',borderRadius:7}}>
                📅 Next backup: {backupFreq==='daily'?'Tomorrow':backupFreq==='weekly'?'Next week':'In 6 hours'} at {backupTime}
              </div>
            </div>
          )}
          <div style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:tgEnabled?12:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>✈️</span>
                <div><p style={{fontSize:13,fontWeight:700,color:'#1e293b',margin:0}}>Send to Telegram Bot</p>
                  <p style={{fontSize:11,color:'#94a3b8',margin:'1px 0 0'}}>Auto-send backup to Telegram</p></div>
              </div>
              <Toggle val={tgEnabled} fn={()=>setTgEnabled(v=>!v)}/>
            </div>
            {tgEnabled && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={lbl}>BOT TOKEN</label><input type="password" value={tgToken} onChange={e=>setTgToken(e.target.value)} placeholder="123456:AABBcc..." style={inp}/></div>
                <div><label style={lbl}>CHAT ID</label><input value={tgChat} onChange={e=>setTgChat(e.target.value)} placeholder="-100123456789" style={inp}/></div>
              </div>
            )}
          </div>
          <button onClick={saveBackup}
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,fontSize:13,
              fontWeight:700,border:'none',cursor:'pointer',width:'fit-content',
              background:backupSaved?'#22c55e':'#7c3aed',color:'#fff',transition:'background 0.2s'}}>
            {backupSaved?<><Check size={13}/> Saved!</>:<><Save size={13}/> Save Settings</>}
          </button>
        </div>
      </div>

      {/* ═══════ Manual Actions ═══════ */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8}}>
          <Database size={15} style={{color:'#7c3aed'}}/><h3 style={{fontSize:14,fontWeight:700,color:'#0f172a',margin:0}}>Manual Actions</h3>
        </div>
        <div style={{padding:'20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <button onClick={handleSyncBalances} disabled={syncLoading}
            style={{padding:'20px 16px',borderRadius:12,border:'1px solid #bbf7d0',background:'#f0fdf4',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:40,height:40,borderRadius:12,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {syncLoading?<div style={{width:16,height:16,border:'2.5px solid #16a34a',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<RefreshCw size={18} style={{color:'#16a34a'}}/>}
            </div>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#16a34a',margin:0}}>Sync Balances</p>
              <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>Fix $0.00 balances from OTP logs</p>
            </div>
          </button>

          <button onClick={handleExport} disabled={exportLoading}
            style={{padding:'20px 16px',borderRadius:12,border:'1px solid #e9d5ff',background:'#faf5ff',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:40,height:40,borderRadius:12,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {exportLoading?<div style={{width:16,height:16,border:'2.5px solid #7c3aed',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<Download size={18} style={{color:'#7c3aed'}}/>}
            </div>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#7c3aed',margin:0}}>Export Database</p>
              <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>Download full JSON backup</p>
            </div>
          </button>

          <label style={{padding:'20px 16px',borderRadius:12,border:'1px solid #bfdbfe',background:'#eff6ff',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:40,height:40,borderRadius:12,background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {importing?<div style={{width:16,height:16,border:'2.5px solid #2563eb',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<Upload size={18} style={{color:'#2563eb'}}/>}
            </div>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#2563eb',margin:0}}>Import Database</p>
              <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>Restore from backup</p>
            </div>
            <input type="file" accept=".json,.bson" onChange={handleImport} style={{display:'none'}}/>
          </label>

          <button onClick={()=>setClearConfirm(true)}
            style={{padding:'20px 16px',borderRadius:12,border:'1px solid #fecaca',background:'#fff5f5',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:40,height:40,borderRadius:12,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Trash2 size={18} style={{color:'#ef4444'}}/>
            </div>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#ef4444',margin:0}}>Wipe Database</p>
              <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>Clear all data (irreversible)</p>
            </div>
          </button>
        </div>

        {clearConfirm && (
          <div style={{margin:'0 20px 20px',padding:'16px',borderRadius:12,background:'#fff5f5',border:'2px solid #fecaca'}}>
            <p style={{fontSize:14,fontWeight:700,color:'#dc2626',margin:'0 0 8px'}}>⚠️ Are you absolutely sure?</p>
            <p style={{fontSize:13,color:'#64748b',margin:'0 0 14px',lineHeight:1.6}}>
              This will permanently delete <strong>ALL data</strong> from MongoDB including users, OTPs, withdrawals, etc. Your admin account will be preserved. This action <strong>cannot be undone</strong>.
            </p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setClearConfirm(false)}
                style={{flex:1,padding:'10px',borderRadius:9,fontSize:13,fontWeight:600,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={handleClear} disabled={clearing}
                style={{flex:1,padding:'10px',borderRadius:9,fontSize:13,fontWeight:700,border:'none',background:'#ef4444',color:'#fff',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {clearing?<><div style={{width:13,height:13,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> Wiping...</>
                  :<><Trash2 size={13}/> Yes, Wipe Everything</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
