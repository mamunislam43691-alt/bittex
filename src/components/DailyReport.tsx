import { useState, useEffect } from 'react'
import { RefreshCw, Table2, Calendar, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Clock, DollarSign, FileText, Download } from 'lucide-react'
import { otpsApi } from '../lib/api'
import { onDataUpdated } from '../lib/socket'

interface DayRow {
  date: string
  allocated: number
  success:   number
  failed:    number
  pending:   number
  revenue:   number
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateShort(iso: string) {
  const d = new Date(iso)
  const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${dayName} ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
}

export default function DailyReport() {
  const [rows, setRows] = useState<DayRow[]>([])
  const [totals, setTotals] = useState({ totalAllocated: 0, totalSuccess: 0, totalFailed: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [lastTick, setLastTick] = useState(0)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await otpsApi.dailyReport(days)
      setRows(res?.rows || [])
      setTotals({
        totalAllocated: res?.totalAllocated || 0,
        totalSuccess:   res?.totalSuccess   || 0,
        totalFailed:    res?.totalFailed    || 0,
        totalRevenue:   res?.totalRevenue   || 0,
      })
      setLastTick(Date.now())
    } catch (err) {
      console.error('Daily report fetch error:', err)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const i = setInterval(fetchData, 30000)
    const u = onDataUpdated((data: any) => { if (data?.type === 'otps') fetchData() })
    return () => { clearInterval(i); u() }
  }, [days])

  const exportCopy = () => {
    const header = 'DATE\tALLOCATED\tSUCCESS\tFAILED\tPENDING\tREVENUE'
    const lines = rows.map(r => `${fmtDate(r.date)}\t${r.allocated}\t${r.success}\t${r.failed}\t${r.pending}\t$${r.revenue.toFixed(4)}`)
    const text = [header, ...lines, '',
      `TOTAL\t${totals.totalAllocated}\t${totals.totalSuccess}\t${totals.totalFailed}\t-\t$${totals.totalRevenue.toFixed(4)}`].join('\n')
    navigator.clipboard.writeText(text)
    flash(true, 'Daily report copied to clipboard (TSV format)')
  }

  const successRate = totals.totalAllocated > 0
    ? ((totals.totalSuccess / totals.totalAllocated) * 100).toFixed(1)
    : '0.0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: msg.ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
        color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Daily Report</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Per-day OTP activity grouped by date · live data from system
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}
            style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 600 }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0',
              background: '#fff', color: '#475569', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            {lastTick ? `Refresh · ${Math.max(0, Math.floor((Date.now() - lastTick) / 1000))}s ago` : 'Refresh'}
          </button>
          <button onClick={exportCopy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
              background: '#7c3aed', color: '#fff', cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard icon={<Calendar size={15} color="#7c3aed" />}
          label="Date Range" value={`${days} days`}
          sub={lastTick ? `Live · updated ${Math.max(0, Math.floor((Date.now() - lastTick) / 1000))}s ago` : 'Loading...'}
          color="#7c3aed" />
        <StatCard icon={<Table2 size={15} color="#0ea5e9" />}
          label="Allocated" value={totals.totalAllocated.toString()}
          sub={`${rows.length} day${rows.length !== 1 ? 's' : ''} included`} color="#0ea5e9" />
        <StatCard icon={parseFloat(successRate) >= 60
          ? <TrendingUp size={15} color="#16a34a" />
          : <TrendingDown size={15} color="#f59e0b" />}
          label="Success Rate" value={`${successRate}%`}
          sub={`${totals.totalSuccess} success`} color="#16a34a" />
        <StatCard icon={<DollarSign size={15} color="#f59e0b" />}
          label="Revenue" value={`$${totals.totalRevenue.toFixed(4)}`}
          sub="Net earnings" color="#f59e0b" />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
        border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} style={{ color: '#7c3aed' }} />
            Daily Breakdown
          </h3>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{rows.length} days</span>
        </div>

        {loading && rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <RefreshCw size={20} className="animate-spin" style={{ marginBottom: 8 }} />
            <div>Loading daily report...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Date', 'Allocated', 'Success', 'Failed', 'Pending', 'Revenue'].map((h, i) => (
                    <th key={h} style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#94a3b8',
                      padding: '12px 14px', textAlign: i === 0 ? 'left' : 'right',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{fmtDate(r.date)}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmtDateShort(r.date)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      {r.allocated.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: r.success > 0 ? '#dcfce7' : '#f8fafc',
                        color: r.success > 0 ? '#16a34a' : '#94a3b8' }}>
                        <CheckCircle size={11} /> {r.success.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: r.failed > 0 ? '#fee2e2' : '#f8fafc',
                        color: r.failed > 0 ? '#dc2626' : '#94a3b8' }}>
                        <XCircle size={11} /> {r.failed.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: r.pending > 0 ? '#fef9c3' : '#f8fafc',
                        color: r.pending > 0 ? '#b45309' : '#94a3b8' }}>
                        <Clock size={11} /> {r.pending.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right',
                      fontSize: 14, fontWeight: 800, color: r.revenue > 0 ? '#16a34a' : '#94a3b8' }}>
                      ${r.revenue.toFixed(4)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #16a34a', borderBottom: 'none' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 800, color: '#16a34a',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Total
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right',
                    fontSize: 15, fontWeight: 900, color: '#16a34a' }}>
                    {totals.totalAllocated.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right',
                    fontSize: 15, fontWeight: 900, color: '#16a34a' }}>
                    {totals.totalSuccess.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right',
                    fontSize: 15, fontWeight: 900, color: '#dc2626' }}>
                    {totals.totalFailed.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right',
                    fontSize: 15, fontWeight: 900, color: '#16a34a' }}>
                    ${totals.totalRevenue.toFixed(4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color = '#7c3aed' }: any) {
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
