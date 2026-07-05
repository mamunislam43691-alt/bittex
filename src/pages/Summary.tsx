import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Download, TrendingUp, DollarSign, CheckCircle, Hash } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { otpsApi } from '../lib/api'
import { onDataUpdated, onOTPReceived } from '../lib/socket'

type Range = '7d' | '30d' | '90d' | 'custom'

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function Summary() {
  const { accentColor } = useTheme()
  const [range, setRange] = useState<Range>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [loading, setLoading] = useState(true)

  // Derived chart data
  const [chartData, setChartData] = useState<{ date: string; success: number; failed: number; earnings: number }[]>([])
  const [totals, setTotals] = useState({ allocated: 0, success: 0, failed: 0, earnings: 0 })
  const [tableRows, setTableRows] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      // All data from DB only — no localStorage
      const res = await otpsApi.list({ limit: 2000 }).catch(() => ({ logs: [] }))
      const logs: any[] = res?.logs || []

      const now = new Date()
      const getDaysAgo = (n: number) => {
        const d = new Date(now); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d.getTime()
      }

      let fromTs = getDaysAgo(7)
      let toTs   = now.getTime()

      if (range === '30d') fromTs = getDaysAgo(30)
      else if (range === '90d') fromTs = getDaysAgo(90)
      else if (range === 'custom' && customFrom && customTo) {
        fromTs = new Date(customFrom).getTime()
        toTs   = new Date(customTo + 'T23:59:59').getTime()
      }

      const filtered = logs.filter(l => {
        const ts = new Date(l.createdAt || l.allocatedAt || 0).getTime()
        return ts >= fromTs && ts <= toTs
      })

      // Build day buckets
      const days: Record<string, { success: number; failed: number; allocated: number; earnings: number }> = {}
      const dayCount = range === '30d' ? 30 : range === '90d' ? 90 : 7
      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        days[key] = { success: 0, failed: 0, allocated: 0, earnings: 0 }
      }

      let totAlloc = 0, totSuccess = 0, totFailed = 0, totEarn = 0

      filtered.forEach(l => {
        const ts = new Date(l.createdAt || l.allocatedAt || 0)
        const key = ts.toISOString().slice(0, 10)
        const earned = l.earnedUser || 0
        totAlloc++
        if (days[key]) days[key].allocated++
        if (l.status === 'success') {
          totSuccess++; totEarn += earned
          if (days[key]) { days[key].success++; days[key].earnings += earned }
        } else if (l.status === 'failed') {
          totFailed++
          if (days[key]) days[key].failed++
        }
      })

      setChartData(Object.entries(days).map(([date, d]) => ({
        date: date.slice(5), // MM-DD
        success: d.success, failed: d.failed,
        earnings: parseFloat(d.earnings.toFixed(2))
      })))
      setTotals({ allocated: totAlloc, success: totSuccess, failed: totFailed, earnings: totEarn })

      // Date-based table rows — newest first (reverse order)
      setTableRows(
        Object.entries(days).map(([date, d]) => ({
          date,
          allocated: d.allocated,
          success: d.success,
          failed: d.failed,
          earnings: `$${d.earnings.toFixed(2)}`,
          rate: d.allocated > 0 ? `${Math.round(d.success / d.allocated * 100)}%` : '0%',
        })).reverse()  // newest dates at top
      )
    } catch {}
    finally { setLoading(false) }
  }, [range, customFrom, customTo])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const u1 = onDataUpdated(() => fetchData())
    const u2 = onOTPReceived(() => fetchData())
    return () => { u1(); u2() }
  }, [fetchData])

  const ranges: { label: string; value: Range }[] = [
    { label: 'Last 7 Days',  value: '7d'     },
    { label: 'Last 30 Days', value: '30d'    },
    { label: 'Last 90 Days', value: '90d'    },
    { label: 'Custom',       value: 'custom' },
  ]

  const rangeLabel = range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days'
    : range === '90d' ? 'Last 90 Days'
    : (customFrom && customTo) ? `${customFrom} → ${customTo}` : 'Custom Range'

  const successRate = totals.allocated > 0 ? `${Math.round(totals.success / totals.allocated * 100)}%` : '0%'

  const handleCSV = () => {
    const header = 'Date,Service,Country,Allocated,Success,Failed,Earnings,Rate'
    const rows = tableRows.map(r => `${r.date},${r.service},${r.country},${r.allocated},${r.success},${r.failed},${r.earnings},${r.rate}`)
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `bittx_summary_${range}.csv`; a.click()
  }

  return (
    <div className="page-wrap">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Summary Dashboard</h1>
          <p className="page-sub">Performance overview and earnings</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {ranges.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                style={range === r.value ? { backgroundColor: accentColor, color: 'white' } : {}}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${range !== r.value ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}>
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>From:</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }}
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"/>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>To:</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }}
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"/>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Allocation', value: loading ? '…' : String(totals.allocated),                        icon: <Hash size={16}/>,         sub: 'Numbers allocated'    },
          { title: 'Success Rate',     value: loading ? '…' : successRate,                                       icon: <TrendingUp size={16}/>,   sub: 'OTP success ratio'    },
          { title: 'Total Earnings',   value: loading ? '…' : `$${totals.earnings.toFixed(2)}`,                  icon: <DollarSign size={16}/>,   sub: 'USD equivalent'       },
          { title: 'Total Success',    value: loading ? '…' : String(totals.success),                             icon: <CheckCircle size={16}/>,  sub: 'Successful OTPs'      },
        ].map(card => (
          <div key={card.title} className="card bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.title}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}18` }}>
                <span style={{ color: accentColor }}>{card.icon}</span>
              </div>
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <h3 className="card-title mb-4">Success vs Failed Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={false} name="Success"/>
              <Line type="monotone" dataKey="failed"  stroke="#ef4444" strokeWidth={2} dot={false} name="Failed"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <h3 className="card-title mb-4">Earnings Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`$${v}`, 'Earnings']}/>
              <Line type="monotone" dataKey="earnings" stroke={accentColor} strokeWidth={2} dot={false} name="Earnings"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="card-title">Detailed Report</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{rangeLabel}</p>
          </div>
          <button onClick={handleCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Download size={12}/> Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['DATE','ALLOCATION','SUCCESS','FAILED','RATE','AMOUNT ($)'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 dark:text-slate-500 px-4 py-2 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">Loading…</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-600">No data for selected period</td></tr>
              ) : (
                <>
                  {tableRows.map((row, i) => {
                    const rate = parseInt(row.rate) || 0
                    return (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{row.date}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{row.allocated}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#22c55e' }}>{row.success}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#ef4444' }}>{row.failed}</td>
                        <td className="px-4 py-2.5">
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                            background: rate === 100 ? '#dcfce7' : rate >= 50 ? '#fef9c3' : '#fee2e2',
                            color: rate === 100 ? '#16a34a' : rate >= 50 ? '#b45309' : '#dc2626',
                          }}>{row.rate}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white">{row.earnings}</td>
                      </tr>
                    )
                  })}
                  {/* TOTAL row */}
                  <tr style={{ borderTop: '2px solid', background: 'rgba(99,102,241,0.05)' }}
                    className="border-indigo-200 dark:border-indigo-800">
                    <td className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">TOTAL</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">{totals.allocated}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: '#22c55e' }}>{totals.success}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: '#ef4444' }}>{totals.allocated - totals.success}</td>
                    <td className="px-4 py-3">
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: successRate === '100%' ? '#dcfce7' : successRate === '0%' ? '#fee2e2' : '#fef9c3',
                        color: successRate === '100%' ? '#16a34a' : successRate === '0%' ? '#dc2626' : '#b45309',
                      }}>{successRate}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black" style={{ color: '#6366f1' }}>${totals.earnings.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
