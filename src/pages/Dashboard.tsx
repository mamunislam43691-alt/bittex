import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Hash, X, Headphones, ExternalLink } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import SupportPanel from '../components/SupportPanel'
import { otpsApi, adminApi } from '../lib/api'
import { onDataUpdated, onOTPReceived } from '../lib/socket'
import { notifyOTP } from '../lib/notificationService'


function MiniSparkline({ data, color = '#7C3AED' }: { data?: number[]; color?: string }) {
  const w = 64, h = 26
  // If backend provided no sparkline data, render a small count badge instead
  if (!data || data.length === 0) {
    return (
      <div style={{
        width: w, height: h, flexShrink: 0,
        background: '#f5f3ff', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color,
      }}>
        {data ? `${Math.max(...data)}` : '—'}
      </div>
    )
  }
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface StatCardProps {
  title: string
  value: string
  sub: string
  icon: React.ReactNode
  accentColor: string
}

function StatCard({ title, value, sub, icon, accentColor }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)', padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start',
      gap: 14, cursor: 'default', transition: 'all 0.2s',
    }}
      className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
    >
      {/* Icon */}
      <div style={{
        width: 38, height: 38, minWidth: 38, borderRadius: 10,
        background: `${accentColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2, flexShrink: 0,
      }}>
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      {/* Text */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 4 }}
          className="text-slate-400 dark:text-slate-500">{title}</p>
        <p className="mask-num text-slate-900 dark:text-white"
          style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{value}</p>
        <p style={{ fontSize: 12 }} className="text-slate-400 dark:text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { username, accentColor, t } = useTheme()
  const { user } = useAuth()
  const [bannerVisible, setBannerVisible] = useState(true)
  const [supportOpen, setSupportOpen] = useState(false)

  // ── Real stats ──
  const [stats, setStats] = useState({
    totalRevenue: 0, totalOTPs: 0,
    totalFailed: 0, totalPending: 0,
  })
  const [hourlyData, setHourlyData] = useState(
    Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2,'0'), traffic: 0 }))
  )
  const [topServices, setTopServices] = useState<any[]>([])
  const [topPerfs, setTopPerfs] = useState<any[]>([])

  // ── Banner announcements (displayType = 'banner') ──
  const [bannerAnns, setBannerAnns] = useState<any[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)

  const fetchStats = useCallback(async () => {
    try {
      // ── All stats come from DB only — no localStorage ──
      const res = await otpsApi.stats().catch(() => null)
      if (!res) return

      setStats({
        totalRevenue:  res.totalRevenue  || 0,
        totalOTPs:     res.totalSuccess  || 0,
        totalFailed:   res.totalFailed   || 0,
        totalPending:  res.totalPending  || 0,
      })

      // Hourly traffic buckets (24h)
      const buckets: number[] = res.hourlyTraffic || Array(24).fill(0)
      setHourlyData(buckets.map((v: number, i: number) => ({ hour: String(i).padStart(2,'0'), traffic: v })))

      // Top services
      const services: any[] = res.topServices || []
      setTopServices(services.slice(0, 10).map((s: any, i: number) => ({
        rank: i + 1, name: s.name, count: s.count,
        // Sparkline is a visual flourish: when backend sends per-day counts via s.spark,
        // use them; otherwise omit so the chart degrades gracefully to a number badge.
        spark: Array.isArray(s.spark) ? s.spark : undefined,
        color: '#7C3AED'
      })))
      setTopPerfs(services.slice(0, 5).map((s: any, i: number) => ({
        rank: i + 1, service: s.name, country: '', numbers: s.count,
        revenue: `$${(s.revenue || 0).toFixed(2)}`, trend: s.count > 0 ? 'up' : 'down'
      })))
    } catch {}
  }, [])

  useEffect(() => {
    fetchStats()
    // Load banner-type announcements
    adminApi.announcements().then((res: any) => {
      const banners = (res?.announcements || []).filter((a: any) =>
        a.active && a.displayType === 'banner'
      )
      setBannerAnns(banners)
    }).catch(() => {})

    const unsub = onDataUpdated(() => fetchStats())
    const unsubOTP = onOTPReceived((data: any) => {
      fetchStats()
      // 🔔 Notify even when user is on Dashboard (not GetNumber)
      if (data?.otp && data?.number) {
        notifyOTP({
          number:  data.number  || '',
          otp:     data.otp     || '',
          service: data.service || '',
          earned:  data.earned  ?? undefined,
        })
      }
    })
    return () => { unsub(); unsubOTP() }
  }, [fetchStats])

  // Auto-rotate banner announcements every 4 seconds
  useEffect(() => {
    if (bannerAnns.length <= 1) return
    const t = setInterval(() => setBannerIdx(i => (i + 1) % bannerAnns.length), 4000)
    return () => clearInterval(t)
  }, [bannerAnns.length])

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Welcome ── */}
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, lineHeight: 1.2 }}
          className="text-slate-900 dark:text-white">
          {t.welcomeBack} <span style={{ color: accentColor }}>{username}</span>!
        </h1>
        <p style={{ fontSize: 14, marginTop: 6, margin: '6px 0 0' }}
          className="text-slate-500 dark:text-slate-400">
          {t.hereIsWhatsHappening}
        </p>
      </div>

      {/* ── Banner Announcements (displayType = 'banner') ── */}
      {bannerAnns.length > 0 && bannerVisible && (() => {
        const ann = bannerAnns[bannerIdx]
        const BANNER_COLORS: Record<string, { bg: string; border: string; icon: string; text: string; subtext: string }> = {
          info:    { bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd', icon: 'ℹ️', text: '#1d4ed8', subtext: '#1e40af' },
          warning: { bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fcd34d', icon: '⚠️', text: '#92400e', subtext: '#78350f' },
          success: { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#86efac', icon: '✅', text: '#166534', subtext: '#14532d' },
          danger:  { bg: 'linear-gradient(135deg,#fff5f5,#fee2e2)', border: '#fca5a5', icon: '🚨', text: '#991b1b', subtext: '#7f1d1d' },
        }
        const bc = BANNER_COLORS[ann.type] || BANNER_COLORS.info
        return (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 18px', borderRadius: 14,
            border: `1px solid ${bc.border}`,
            background: bc.bg,
            transition: 'all 0.3s ease',
            position: 'relative',
          }}>
            <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{bc.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: bc.text }}>{ann.title}</p>
              <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, color: bc.subtext }}>{ann.message}</p>
              {ann.buttonText && ann.buttonUrl && (
                <a href={ann.buttonUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '5px 12px', borderRadius: 7, background: bc.border, color: bc.text, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                  <ExternalLink size={11}/> {ann.buttonText}
                </a>
              )}
            </div>
            {/* Dots navigation if multiple banners */}
            {bannerAnns.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 4 }}>
                {bannerAnns.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    style={{ width: 6, height: i === bannerIdx ? 18 : 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === bannerIdx ? bc.text : `${bc.text}40`, transition: 'all 0.2s' }} />
                ))}
              </div>
            )}
            <button onClick={() => setBannerVisible(false)}
              style={{ background: `${bc.border}50`, border: 'none', cursor: 'pointer', padding: 5, flexShrink: 0, borderRadius: 7, color: bc.text }}>
              <X size={14} />
            </button>
          </div>
        )
      })()}

      {/* ── Stat Cards ── */}
      <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <StatCard title="My Balance"        value={`$${(user?.balance ?? 0).toFixed(2)}`}   sub="Available to withdraw"      icon={<DollarSign size={20}/>} accentColor="#22c55e"/>
        <StatCard title="Total Revenue"     value={`$${stats.totalRevenue.toFixed(2)}`}      sub="All-time earnings"          icon={<DollarSign size={20}/>} accentColor={accentColor}/>
        <StatCard title="Total Success"     value={String(stats.totalOTPs)}                  sub="Successful OTPs"            icon={<Hash size={20}/>}       accentColor={accentColor}/>
        <StatCard title="Total Failed"      value={String(stats.totalFailed)}                sub="All-time failed"            icon={<Hash size={20}/>}       accentColor="#ef4444"/>
      </div>

      {/* ── Charts Row ── */}
      <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Hourly Traffic */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '20px 24px',
          border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}
                className="text-slate-900 dark:text-white">{t.hourlyTraffic}</h2>
              <p style={{ fontSize: 13, marginTop: 4 }}
                className="text-slate-400 dark:text-slate-500">{t.otpRequestsPerHour}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px',
              borderRadius: 20, background: `${accentColor}15`, color: accentColor }}>
              ● {t.live}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                formatter={(v) => [`${v} OTPs`, 'Traffic']}
                labelFormatter={(l) => `${l}:00`}
              />
              <Line type="monotone" dataKey="traffic" stroke={accentColor}
                strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: accentColor }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Global Trending */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '20px 24px',
          border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}
                className="text-slate-900 dark:text-white">{t.globalTrending}</h2>
              <p style={{ fontSize: 13, marginTop: 4 }}
                className="text-slate-400 dark:text-slate-500">{t.topServicesByOTPVolume}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px',
              borderRadius: 20, background: `${accentColor}15`, color: accentColor }}>
              ● {t.live}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(topServices.length > 0 ? topServices : []).map((svc) => {
              const rankColors: Record<number,{bg:string;text:string}> = {
                1: { bg:'#6366f1', text:'#fff' },
                2: { bg:'#1e293b', text:'#fff' },
                3: { bg:'#f59e0b', text:'#fff' },
              }
              const rc = rankColors[svc.rank] ?? { bg:'#f1f5f9', text:'#64748b' }
              return (
                <div key={svc.name}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                    borderRadius:12, background:'var(--bg-card)',
                    border:'1px solid var(--border)', transition:'background 0.12s' }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  {/* Rank circle */}
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                    background:rc.bg, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:800, color:rc.text }}>
                    {svc.rank}
                  </div>
                  {/* Name */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, margin:0, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                      className="text-slate-800 dark:text-slate-200">{svc.name}</p>
                  </div>
                  {/* Sparkline */}
                  <MiniSparkline data={svc.spark} color={svc.color}/>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Top Performers ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}
            className="text-slate-900 dark:text-white">{t.yourTopPerformers}</h2>
          <p style={{ fontSize: 13, marginTop: 4 }}
            className="text-slate-400 dark:text-slate-500">{t.bestServicesByRevenue}</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--input-bg)' }}>
                {[t.service, t.volume, t.earnings].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '10px 24px', whiteSpace: 'nowrap' }}
                    className="text-slate-400 dark:text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(topPerfs.length > 0 ? topPerfs : []).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px 24px',
                    fontSize: 14 }} className="text-slate-400 dark:text-slate-500">
                    {t.noActivityRecorded}
                  </td>
                </tr>
              ) : (topPerfs.length > 0 ? topPerfs : []).map(p => (
                <tr key={p.rank} style={{ borderBottom: '1px solid var(--border)' }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
                    className="text-slate-800 dark:text-slate-200">{p.service}</td>
                  <td style={{ padding: '12px 24px', fontSize: 14, fontFamily: 'monospace' }}
                    className="text-slate-600 dark:text-slate-400">{p.numbers.toLocaleString()}</td>
                  <td style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
                    className="text-slate-900 dark:text-white">
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {p.trend === 'up'
                        ? <TrendingUp size={14} style={{color:'#16a34a'}}/>
                        : <TrendingDown size={14} style={{color:'#ef4444'}}/>
                      }
                      {p.revenue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support Button */}
      <button
        onClick={() => setSupportOpen(true)}
        title="লাইভ সাপোর্ট খুলুন"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: accentColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 35,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="hover:scale-110 hover:shadow-2xl active:scale-95"
        onMouseEnter={e => {
          const target = e.currentTarget as HTMLButtonElement
          target.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={e => {
          const target = e.currentTarget as HTMLButtonElement
          target.style.transform = 'scale(1)'
        }}
      >
        <Headphones size={24} strokeWidth={1.5} />
      </button>

      {/* Support Panel */}
      <SupportPanel isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
