import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Search, Pause, Play, RefreshCw, Copy, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { otpsApi } from '../lib/api'
import { onDataUpdated, onOTPLive, onOTPReceived } from '../lib/socket'

const APP_COLORS = ['#6366f1', '#a78bfa', '#fbbf24', '#10b981', '#f97316', '#3b82f6', '#ec4899', '#14b8a6', '#ef4444', '#0ea5e9']
const CARRIER_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#f43f5e']

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTs(d: Date) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** Mask OTP code in message — replace numeric sequences with *** */
function maskOTP(message: string, otp?: string): string {
  if (!message) return '—'
  if (otp && message.includes(otp)) {
    return message.replace(otp, '***')
  }
  // Also mask standalone 6-digit numbers
  return message.replace(/\b\d{4,8}\b/g, '***')
}

interface OtpLog {
  _id?: string; id?: string; number: string; range?: string; service?: string
  operator?: string; country?: string; status: 'pending' | 'success' | 'failed'
  otp?: string; message?: string; allocatedAt?: string; resolvedAt?: string; earnedUser?: number
}

/** Clickable badge that copies text on click and shows a tooltip on hover */
function CopyBadge({ text, label, className = '', style = {} }: {
  text: string; label?: string; className?: string; style?: React.CSSProperties
}) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text || text === '—') return
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isActive = text && text !== '—'

  return (
    <span
      onClick={handleCopy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: 'relative',
        cursor: isActive ? 'pointer' : 'default',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        // Flash green on copy
        ...(copied ? { background: '#dcfce7 !important', color: '#16a34a', borderColor: '#86efac' } : {}),
        ...style,
      }}
    >
      {label || text}
      {isActive && (hovered || copied) && (
        <span style={{ flexShrink: 0, display: 'inline-flex' }}>
          {copied
            ? <Check size={10} style={{ color: '#16a34a' }} />
            : <Copy size={10} style={{ color: 'inherit', opacity: 0.55 }} />
          }
        </span>
      )}
      {/* Tooltip — shows on hover */}
      {hovered && isActive && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.92)', color: '#fff',
          fontSize: 11, fontWeight: 600, padding: '4px 10px',
          borderRadius: 6, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 200,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
        }}>
          {copied ? '✓ Copied!' : '📋 Click to copy range'}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(15,23,42,0.92)',
          }} />
        </span>
      )}
    </span>
  )
}

export default function Console() {
  const { accentColor } = useTheme()
  const [logs, setLogs] = useState<OtpLog[]>([])
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [lastUpdated, setLastUpdated] = useState(fmtTs(new Date()))
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await otpsApi.list({ limit: 100 }).catch(() => ({ logs: [] }))
      // All logs from DB — success only for the console view
      const serverLogs: any[] = (res?.logs || [])
        .filter((l: any) => l.status === 'success')
        .map((l: any) => ({ ...l, id: l._id || l.id }))

      setLogs(serverLogs.slice(0, 100))
      setLastUpdated(fmtTs(new Date()))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  useEffect(() => {
    const u1 = onDataUpdated((data: any) => { if (data?.type === 'otps') fetchLogs() })
    const u2 = onOTPLive((data: any) => {
      if (paused) return
      setLogs(prev => {
        if (prev.some(l => (l.id || l._id) === data.logId)) return prev
        return [{ _id: data.logId, id: data.logId, number: data.number || '', service: data.service || '',
          country: data.country || '', range: data.range || '', status: 'success', otp: data.otp || '',
          message: `Your ${data.service || ''} code is: ${data.otp || ''}`,
          allocatedAt: data.ts || new Date().toISOString(), resolvedAt: new Date().toISOString() } as OtpLog,
          ...prev].slice(0, 100)
      })
      setLastUpdated(fmtTs(new Date()))
    })
    const u3 = onOTPReceived((data: any) => {
      if (paused) return
      setLogs(prev => {
        if (prev.some(l => (l.id || l._id) === data.logId)) return prev
        return [{ _id: data.logId, id: data.logId, number: data.number || '', service: data.service || '',
          status: 'success', otp: data.otp || '', message: `Your ${data.service || ''} code is: ${data.otp || ''}`,
          allocatedAt: new Date().toISOString(), resolvedAt: new Date().toISOString() } as OtpLog,
          ...prev].slice(0, 100)
      })
    })
    return () => { u1(); u2(); u3() }
  }, [fetchLogs, paused])

  const topAppsData = (() => {
    const map: Record<string, number> = {}
    logs.filter(l => l.status === 'success').forEach(l => { const k = l.service || 'unknown'; map[k] = (map[k] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([app, count]) => ({ app, count }))
  })()

  const carrierData = (() => {
    const map: Record<string, number> = {}
    logs.filter(l => l.status === 'success').forEach(l => { const k = l.operator || 'Unknown'; map[k] = (map[k] || 0) + 1 })
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map).map(([name, value]) => ({ name, value: total > 0 ? Math.round((value / total) * 100) : 0 }))
  })()

  const filteredLogs = filter
    ? logs.filter(l => (l.service || '').toLowerCase().includes(filter.toLowerCase()) ||
        (l.range || '').toLowerCase().includes(filter.toLowerCase()) ||
        (l.country || '').toLowerCase().includes(filter.toLowerCase()) ||
        (l.number || '').includes(filter))
    : logs

  return (
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 className="text-slate-900 dark:text-white" style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Live Console</h1>
        <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 14, marginTop: 4 }}>
          Streaming OTP activity from your account · data refreshes every 5s + instant socket updates
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Top Apps */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 14, padding: '20px 24px' }}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Top Apps</h3>
          {topAppsData.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No successful OTPs yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topAppsData} margin={{ top: 20, right: 4, bottom: 4, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="app" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} formatter={(v) => [`${v} OTPs`, 'Count']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {topAppsData.map((_, i) => <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {topAppsData.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800" style={{ marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', maxHeight: 200, overflowY: 'auto' }}>
              {topAppsData.map((item, i) => {
                const total = topAppsData.reduce((s, d) => s + d.count, 0)
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <div key={item.app} className="border-b border-slate-50 dark:border-slate-800/50" style={{ display: 'flex', alignItems: 'center', padding: '8px 4px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, marginRight: 12, background: APP_COLORS[i % APP_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-300" style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.app}</span>
                    <span className="text-slate-900 dark:text-white" style={{ fontSize: 13, fontWeight: 700, marginRight: 16, minWidth: 24, textAlign: 'right' }}>{item.count}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Carrier Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 14, padding: '20px 24px' }}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Carrier Distribution</h3>
          {carrierData.length === 0 || carrierData.every(c => c.value === 0) ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No carrier data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={carrierData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {carrierData.map((_, i) => <Cell key={i} fill={CARRIER_COLORS[i % CARRIER_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} layout="horizontal" align="center" verticalAlign="bottom" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} formatter={(v) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Live Console table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 14, overflow: 'visible' }}>
        <div className="border-b border-slate-100 dark:border-slate-800" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700 }}>{'> Live Console'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              {paused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Filter logs..." value={filter} onChange={e => setFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontSize: 12, borderRadius: 8, outline: 'none', width: 160, boxSizing: 'border-box' }} />
            </div>
            <button onClick={fetchLogs} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => setPaused(v => !v)}
              className={paused ? '' : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ...(paused ? { background: accentColor, color: '#fff' } : {}) }}>
              {paused ? <Play size={12} /> : <Pause size={12} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
          style={{ display: 'grid', gridTemplateColumns: '70px 130px 180px 140px 1fr', gap: 12, padding: '8px 20px' }}>
          {[
            { h: 'TIME', hint: '' },
            { h: 'SERVICE', hint: '' },
            { h: 'PLATFORM', hint: '' },
            { h: 'RANGE', hint: '📋 click to copy' },
            { h: 'SMS', hint: '' },
          ].map(({ h, hint }) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
              {h}
              {hint && (
                <span style={{ fontSize: 10, fontWeight: 500, color: '#c4b5fd',
                  textTransform: 'none', letterSpacing: 0, fontFamily: 'system-ui' }}>
                  {hint}
                </span>
              )}
            </span>
          ))}
        </div>

        <div ref={scrollRef} style={{ maxHeight: 420, overflowY: 'auto' }}>
          {loading && logs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              <RefreshCw size={20} className="animate-spin" style={{ marginBottom: 8 }} />
              <div>Loading OTP logs...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
              No logs match your filter. Allocate a number (or wait for OTP delivery) to see entries here.
            </div>
          ) : filteredLogs.map(log => {
            const ts = log.resolvedAt || log.allocatedAt
            const t = ts ? new Date(ts) : new Date()
            return (
              <div key={log.id || log._id}
                className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                style={{ display: 'grid', gridTemplateColumns: '70px 130px 180px 140px 1fr', alignItems: 'start', padding: '12px 20px', borderLeft: `3px solid ${log.status === 'success' ? '#22c55e' : log.status === 'failed' ? '#ef4444' : '#f59e0b'}`, gap: 12 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', paddingTop: 4, whiteSpace: 'nowrap' }}>{fmtTs(t)}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px' }} className="text-slate-700 dark:text-slate-200">
                    {log.operator || 'Mobile'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{log.country || '—'}</p>
                </div>
                <div style={{ paddingTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{log.service || '—'}</span>
                </div>
                <div style={{ paddingTop: 4 }}>
                  <CopyBadge
                    text={log.range || ''}
                    label={log.range || '—'}
                    className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50"
                    style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}
                  />
                </div>
                <div style={{ paddingTop: 4 }}>
                  <p className="text-slate-600 dark:text-slate-300" style={{ fontSize: 13, margin: 0, lineHeight: 1.5, fontFamily: 'monospace' }}>
                    {maskOTP(log.message || log.number || '—', log.otp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Last Updated: {lastUpdated} UTC</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'} (max 100)</span>
        </div>
      </div>
    </div>
  )
}
