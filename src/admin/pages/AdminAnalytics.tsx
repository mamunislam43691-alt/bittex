import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { adminApi, api } from '../../lib/api'
import { RefreshCw, BarChart3, Globe, Users as UsersIcon } from 'lucide-react'
import { onDataUpdated } from '../../lib/socket'

const COLORS = ['#7c3aed', '#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#94a3b8']

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [daily, setDaily] = useState<any[]>([])
  const [countryData, setCountryData] = useState<{ name: string; value: number }[]>([])
  const [days, setDays] = useState(30)

  const fetchData = async (d = days) => {
    setLoading(true)
    try {
      // Revenue + OTP data
      const res = await adminApi.revenueAnalytics(d)
      const data = res?.data || []
      setDaily(data.map((item: any) => ({
        day: item.date ? item.date.slice(5) : '',
        revenue: parseFloat(item.revenue || 0),
        otps: item.otps || 0,
      })))

      // Country distribution — server-side aggregation (no 2000-user fetch)
      try {
        const countryRes = await adminApi.countriesAnalytics()
        setCountryData(countryRes?.countries || [])
      } catch {
        setCountryData([])
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setDaily([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(days) }, [days])

  // Realtime: refresh when an OTP, withdrawal, or user change occurs
  useEffect(() => {
    const unsub = onDataUpdated((data: any) => {
      if (['otps','withdrawals','users','agents'].includes(data?.type)) fetchData(days)
    })
    return unsub
  }, [days])

  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0)
  const totalOtps    = daily.reduce((s, d) => s + d.otps, 0)
  const avgPerDay    = daily.length ? totalRevenue / daily.length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Platform performance — real data
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}
            style={{
              padding: '7px 10px', fontSize: 12, borderRadius: 7,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#1e293b', cursor: 'pointer',
            }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={() => fetchData(days)} disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', cursor: 'pointer',
            }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ROW 1 — Top: Quick stats (4 cards including Top Country) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: `Revenue (${days}d)`,    value: `$${totalRevenue.toFixed(2)}`, color: '#7c3aed', bg: '#f5f3ff' },
          { label: `OTPs (${days}d)`,       value: totalOtps.toLocaleString(),    color: '#0ea5e9', bg: '#f0f9ff' },
          { label: `Avg / Day (${days}d)`,  value: `$${avgPerDay.toFixed(2)}`,    color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Top Country',           value: countryData[0]?.name || '—',     color: '#f59e0b', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ROW 2 — Country pie + Country breakdown list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Globe size={16} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Users by Country
            </h3>
          </div>
          {countryData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No user data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%" cy="45%"
                  innerRadius={45} outerRadius={75}
                  paddingAngle={3} dataKey="value"
                >
                  {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend
                  iconType="circle" iconSize={9}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${v}%`, 'Share']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <UsersIcon size={16} style={{ color: '#0ea5e9' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Country Breakdown
            </h3>
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: '#64748b',
              fontWeight: 600, padding: '2px 8px',
              background: '#f1f5f9', borderRadius: 6,
            }}>
              {countryData.length} countries
            </span>
          </div>
          {countryData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No data
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {countryData.map((c, i) => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: i === 0 ? '#f5f3ff' : '#f8fafc',
                  borderRadius: 8,
                  border: i === 0 ? '1px solid #ddd6fe' : '1px solid #f1f5f9',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: COLORS[i % COLORS.length], flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: COLORS[i % COLORS.length],
                    fontFamily: 'monospace',
                  }}>
                    {c.value}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW 3 — Middle: Revenue Trend line chart */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          {days}-Day Revenue Trend
        </h3>
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
          Based on successful OTP earnings (user + agent shares)
        </p>
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Loading...
          </div>
        ) : daily.length === 0 ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            No revenue data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily} margin={{ left: -20, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(daily.length / 7))}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ROW 4 — Bottom: Daily OTP Volume bar chart */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          Daily OTP Volume
        </h3>
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
          OTPs processed per day (last 14 days)
        </p>
        {loading ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Loading...
          </div>
        ) : daily.length === 0 ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            No OTP data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={daily.slice(-14)} margin={{ left: -20, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="otps" fill="#6366f1" radius={[3, 3, 0, 0]} name="OTPs" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
