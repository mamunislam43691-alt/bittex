import { useState, useEffect, useCallback } from 'react'
import { Users, DollarSign, Activity, TrendingUp, CreditCard, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, UserCheck, UserX, UserCog, XCircle, BarChart2, Percent, Trash2, RefreshCw, Hash } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, adminApi, withdrawalsApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'
import ConfirmDialog from '../../components/ConfirmDialog'

function StatCard({ title, value, sub, icon, color, trend, trendDown }: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string; trend?: string; trendDown?: boolean
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 22px',
      border: '1px solid #e2e8f0', transition: 'all 0.2s'
    }}
      className="hover:-translate-y-0.5 hover:shadow-lg">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: trendDown ? '#ef4444' : '#22c55e',
            display: 'flex', alignItems: 'center', gap: 3
          }}>
            {trendDown ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />} {trend}
          </span>
        )}
      </div>
      <p style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4
      }}>{title}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#64748b' }}>{sub}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [now, setNow] = useState(new Date())
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [msg, setMsg] = useState({ok:true,text:''})
  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg({ok:true,text:''}),3000) }

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, wdsData, usersData, analyticsData] = await Promise.allSettled([
        adminApi.stats(),
        withdrawalsApi.list('pending'),
        api.get('/users?limit=5'),
        adminApi.revenueAnalytics(7),
      ])

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value)
      }
      if (wdsData.status === 'fulfilled') {
        const wds = wdsData.value?.withdrawals || wdsData.value || []
        setPendingWithdrawals(Array.isArray(wds) ? wds.filter((w: any) => w.status === 'pending') : [])
      }
      if (usersData.status === 'fulfilled') {
        const users = usersData.value?.users || []
        setRecentUsers(users.slice(0, 5))
      }
      if (analyticsData.status === 'fulfilled') {
        const data = analyticsData.value?.data || []
        setRevenueData(data.map((d: any) => ({
          day: d.date ? d.date.slice(5) : '',
          revenue: parseFloat(d.revenue || 0),
          otps: d.otps || 0,
        })))
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const unsub = onDataUpdated(() => {
      fetchAll()
    })
    return unsub
  }, [])

  const handleResetDatabase = async () => {
    setShowResetConfirm(false)
    setResetting(true)
    try {
      await adminApi.wipeDatabase()
      flash(true, 'Database wiped successfully! All data has been cleared except your admin account.')
      window.location.reload()
    } catch (error: any) {
      flash(false, 'Failed to wipe database: ' + (error.message || 'Unknown error'))
    } finally {
      setResetting(false)
    }
  }

  const s = stats || {}
  /* Safe number formatting — never display NaN, 'failed', or literal undefined */
  const fmt = (n: any, fallback = 0) => {
    const v = Number(n)
    return Number.isFinite(v) ? v.toLocaleString() : String(fallback)
  }
  const fmtMoney = (n: any) => {
    const v = Number(n)
    return Number.isFinite(v) ? v.toFixed(2) : '0.00'
  }
  const totalUsers       = fmt(s.totalUsers)
  const activeUsers      = fmt(s.activeUsers)
  const deactiveUsers    = fmt(s.deactiveUsers)
  const totalAgents      = fmt(s.totalAgents)
  const activeAgents     = fmt(s.activeAgents)
  const deactiveAgents   = fmt(s.deactiveAgents)
  const totalEarnings    = `$${fmtMoney(s.totalEarnings)}`
  const userEarnings     = `$${fmtMoney(s.userEarnings)}`
  const agentEarnings    = `$${fmtMoney(s.agentEarnings)}`
  const successOTPs      = fmt(s.successOTPs)
  const failOTPs         = fmt(s.failOTPs)
  const pendingOTPs      = fmt(s.pendingOTPs)
  const totalNumbersUsed = fmt(s.totalNumbersUsed ?? s.totalNumbers)
  const avgSuccessRate   = fmt(s.avgSuccessRate)
  const pendingCount     = fmt(s.pendingWithdrawals)
  const pendingAmt       = `$${fmtMoney(s.pendingWithdrawalAmount)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {msg.text && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Welcome back, Super Admin · {now.toUTCString().split(' ').slice(0, 5).join(' ')}
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Stat cards - Row 1: Agents + Users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard title="Total Agents"    value={totalAgents.toString()}    sub="All registered agents"  icon={<UserCog size={20} />}   color="#8b5cf6" />
        <StatCard title="Active Agents"   value={activeAgents.toString()}   sub="Currently active"       icon={<UserCheck size={20} />} color="#22c55e" />
        <StatCard title="Deactive Agents" value={deactiveAgents.toString()} sub="Currently offline"      icon={<UserX size={20} />}     color="#ef4444" trendDown />
        <StatCard title="Total Users"     value={totalUsers.toString()}     sub="All registered users"   icon={<Users size={20} />}     color="#7c3aed" />
      </div>

      {/* Stat cards - Row 2: Numbers + Earnings + Success */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard title="Active Users"      value={activeUsers.toString()}       sub="Currently active"             icon={<UserCheck size={20} />}  color="#10b981" />
        <StatCard title="Total Numbers"     value={totalNumbersUsed.toString()}  sub="Numbers used by users & agents" icon={<Hash size={20} />}       color="#f59e0b" />
        <StatCard title="Total Earnings"    value={totalEarnings}                sub={`Users ${userEarnings} · Agents ${agentEarnings}`} icon={<DollarSign size={20} />} color="#0ea5e9" />
        <StatCard title="Total Success"     value={successOTPs.toString()}       sub="Successful OTPs"              icon={<CheckCircle size={20} />} color="#22c55e" />
      </div>

      {/* Stat cards - Row 3: Failed + Pending + Withdrawals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard title="Total Failed"        value={failOTPs.toString()}     sub="Failed OTPs"                   icon={<XCircle size={20} />}    color="#ef4444" trendDown />
        <StatCard title="Pending Numbers"     value={pendingOTPs.toString()}  sub="Waiting for OTP arrival"       icon={<Clock size={20} />}      color="#f59e0b" />
        <StatCard title="Avg. Success Rate"   value={`${avgSuccessRate || 0}%`} sub="Platform wide average"       icon={<Percent size={20} />}    color="#06b6d4" />
        <StatCard title="Pending Withdrawals" value={pendingAmt}              sub={`${pendingCount} requests`}    icon={<CreditCard size={20} />} color="#e11d48" />
      </div>

      {/* Activity Overview */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Activity Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Active Users',    value: activeUsers,    color: '#22c55e', bg: '#dcfce7', icon: <UserCheck size={16} /> },
            { label: 'Inactive Users',  value: deactiveUsers,  color: '#6b7280', bg: '#f3f4f6', icon: <UserX size={16} /> },
            { label: 'Active Agents',   value: activeAgents,   color: '#3b82f6', bg: '#dbeafe', icon: <UserCheck size={16} /> },
            { label: 'Inactive Agents', value: deactiveAgents, color: '#ef4444', bg: '#fee2e2', icon: <UserX size={16} /> },
          ].map(c => (
            <div key={c.label} style={{
              background: '#fff', borderRadius: 12, padding: '14px 16px',
              border: `1px solid ${c.bg}`, display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: 0 }}>{c.label}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1.1, margin: '2px 0 0' }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Revenue chart */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Revenue & OTPs (Last 7 Days)</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Platform-wide performance</p>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                <Bar dataKey="otps" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="OTPs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              No revenue data yet
            </div>
          )}
        </div>

        {/* Pending withdrawals */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Pending Withdrawals</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#fee2e2', color: '#ef4444' }}>
              {pendingWithdrawals.length} pending
            </span>
          </div>
          {pendingWithdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13 }}>All clear!</p>
            </div>
          ) : pendingWithdrawals.map((w: any) => (
            <div key={w._id || w.id} style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{w.username || w.userId}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>${parseFloat(w.amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{w.network}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Users + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Recent users table */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Recent Users</h3>
          </div>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['User', 'Role', 'Balance', 'OTPs', 'Status'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '8px 18px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u: any) => (
                <tr key={u._id || u.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50 transition-colors">
                  <td style={{ padding: '12px 18px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{u.username}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{u.email}</p>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
                      background: u.role === 'admin' ? '#fee2e2' : u.role === 'moderator' ? '#fef3c7' : u.role === 'support' ? '#dbeafe' : '#f3f4f6',
                      color: u.role === 'admin' ? '#ef4444' : u.role === 'moderator' ? '#b45309' : u.role === 'support' ? '#2563eb' : '#6b7280',
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>${(u.balance || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 18px', fontSize: 13, color: '#475569' }}>{(u.otpCount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase',
                      background: u.status === 'active' ? '#dcfce7' : u.status === 'banned' ? '#fee2e2' : '#fef9c3',
                      color: u.status === 'active' ? '#16a34a' : u.status === 'banned' ? '#dc2626' : '#b45309',
                    }}>{u.status}</span>
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Approve All Withdrawals', color: '#22c55e', icon: <CheckCircle size={14} />, onClick: async () => { try { await withdrawalsApi.approveAll(); fetchAll(); flash(true, 'All pending withdrawals approved!') } catch(e:any){flash(false, e.message)} } },
              { label: 'Broadcast Announcement', color: '#7c3aed', icon: <AlertTriangle size={14} />, onClick: () => {} },
              { label: 'Export User Report',     color: '#0ea5e9', icon: <Users size={14} />,        onClick: () => { window.open(adminApi.exportDatabase(), '_blank') } },
              { label: 'View OTP Monitor',       color: '#f59e0b', icon: <Activity size={14} />,    onClick: () => {} },
              { label: 'Refresh Dashboard',      color: '#6b7280', icon: <Clock size={14} />,        onClick: fetchAll },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${a.color}30`, background: `${a.color}08`, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: a.color, textAlign: 'left' }}>
                {a.icon} {a.label}
              </button>
            ))}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid #ef444430`, background: '#ef444408', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, color: '#ef4444', textAlign: 'left', opacity: resetting ? 0.6 : 1 }}>
              {resetting ? <RefreshCw size={14} /> : <Trash2 size={14} />}
              {resetting ? 'Wiping Database...' : 'Wipe Database (Clear All Data)'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Wipe Database?"
        message="This will permanently delete ALL data from the database including users, agents, OTPs, withdrawals, announcements, news, and support tickets. Your admin account will be preserved.\n\nThis action cannot be undone."
        confirmLabel="Yes, Wipe Everything"
        cancelLabel="Cancel"
        confirmColor="#ef4444"
        icon={<Trash2 size={20} />}
        onConfirm={handleResetDatabase}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
