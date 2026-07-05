import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { DollarSign, TrendingUp, Activity, Hash, Clock, CheckCircle, XCircle, ArrowUpRight, Users, XOctagon } from 'lucide-react'
import { otpsApi, agentApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

function StatCard({ title, value, sub, icon, color }: { title: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0' }}
      className="hover:-translate-y-0.5 hover:shadow-md transition-all">
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#64748b' }}>{sub}</p>
    </div>
  )
}

export default function AgentDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [agentStats, setAgentStats] = useState<any>(null)
  const [otpFilter, setOtpFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all')
  const [myOTPLogs, setMyOTPLogs] = useState<any[]>([])
  const [otpsLoading, setOtpsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await agentApi.stats()
      setAgentStats(res)
    } catch (err) {
      console.error('Agent stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMyOTPs = useCallback(async () => {
    setOtpsLoading(true)
    try {
      const res = await otpsApi.list({ limit: 200 })
      const logs = res?.logs || []
      setMyOTPLogs(logs.map((l: any) => ({
        id: l._id || l.id,
        number: l.number || '—',
        service: l.service || '—',
        country: l.country || '—',
        status: l.status === 'success' ? 'success' : l.status === 'failed' ? 'failed' : 'pending',
        time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString() : '—',
        date: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—',
        earnings: l.earnedAgent || l.earnedUser || 0,
      })))
    } catch (err) {
      console.error('OTP fetch error:', err)
    } finally { setOtpsLoading(false) }
  }, [])

  useEffect(() => {
    // Load stats and OTP logs in parallel
    Promise.allSettled([fetchStats(), fetchMyOTPs()])
  }, [fetchStats, fetchMyOTPs])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'otps' || data.type === 'users') {
        fetchStats()
        fetchMyOTPs()
      }
    })
    return unsub
  }, [fetchStats, fetchMyOTPs])

  // Derived from DB stats
  const s = agentStats || {}
  const totalUsers    = s.totalUsers    || 0
  const activeUsers   = s.activeUsers   || 0
  const totalOTPs     = s.totalOTPs     || 0
  const totalSuccess  = s.totalSuccess  || 0
  const totalFailed   = s.totalFailed   || 0
  const totalRevenue  = s.totalRevenue  || 0
  const agentComm     = s.agentCommission || 0
  const todayOTPs     = s.todayOTPs     || 0
  const todayRevenue  = s.todayRevenue  || 0
  const successRate   = totalOTPs > 0 ? ((totalSuccess / totalOTPs) * 100).toFixed(1) : '0'

  // OTP log-level stats (for the table section)
  const myTotalOTPs   = myOTPLogs.length
  const mySuccessOTPs = myOTPLogs.filter(o => o.status === 'success').length
  const myFailedOTPs  = myOTPLogs.filter(o => o.status === 'failed').length
  const myPendingOTPs = myOTPLogs.filter(o => o.status === 'pending').length
  const myOTPEarnings = myOTPLogs.reduce((s, o) => s + (o.earnings || 0), 0)
  const mySuccessRate = myTotalOTPs > 0 ? ((mySuccessOTPs / myTotalOTPs) * 100).toFixed(1) : '0'

  const filteredOTPs = otpFilter === 'all' ? myOTPLogs : myOTPLogs.filter(o => o.status === otpFilter)

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Agent Dashboard</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Welcome back, {user?.username} · Commission: {user?.commission || 10}%</p>
      </div>

      {/* Main stats — all from DB */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard title="My Users"       value={totalUsers.toLocaleString()}       sub={`${activeUsers} active`}                  icon={<Users size={20} />}      color="#6366f1" />
        <StatCard title="My Commission"  value={`$${agentComm.toFixed(2)}`}        sub={`${user?.commission || 10}% of revenue`}  icon={<DollarSign size={20} />}  color="#22c55e" />
        <StatCard title="Total OTPs"     value={totalSuccess.toLocaleString()}      sub="Successful (all time)"                    icon={<Hash size={20} />}        color="#f59e0b" />
        <StatCard title="Total Failed"   value={totalFailed.toLocaleString()}       sub="Failed OTPs (all time)"                   icon={<XOctagon size={20} />}    color="#ef4444" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard title="Today OTPs"     value={todayOTPs.toLocaleString()}         sub="Last 12 hours"                            icon={<Activity size={20} />}    color="#0ea5e9" />
        <StatCard title="Today Revenue"  value={`$${todayRevenue.toFixed(2)}`}      sub="Last 12 hours"                            icon={<DollarSign size={20} />}  color="#7c3aed" />
        <StatCard title="Total Revenue"  value={`$${totalRevenue.toFixed(2)}`}      sub="All-time user earnings"                   icon={<TrendingUp size={20} />}  color="#0ea5e9" />
        <StatCard title="Success Rate"   value={`${successRate}%`}                  sub="All-time success rate"                    icon={<CheckCircle size={20} />} color="#22c55e" />
      </div>

        {/* ── My OTPs Section ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#ede9fe',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Hash size={16} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>My OTPs</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Recent OTP logs (last 200)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {(['all', 'success', 'failed', 'pending'] as const).map(f => (
              <button key={f} onClick={() => setOtpFilter(f)}
                style={{
                  padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                  background: otpFilter === f ? '#fff' : 'transparent',
                  color: otpFilter === f ? '#6366f1' : '#64748b',
                  boxShadow: otpFilter === f ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                }}>
                {f === 'all' ? `All (${myTotalOTPs})` : f === 'success' ? `✓ ${mySuccessOTPs}` : f === 'pending' ? `⏳ ${myPendingOTPs}` : `✕ ${myFailedOTPs}`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row — from DB aggregation */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0,
          borderBottom: '1px solid #f1f5f9'
        }}>
          {[
            { label: 'Total (All Time)', value: totalOTPs.toLocaleString(),    color: '#6366f1', icon: <Hash size={14} /> },
            { label: 'Successful',       value: totalSuccess.toLocaleString(), color: '#22c55e', icon: <CheckCircle size={14} /> },
            { label: 'Failed',           value: totalFailed.toLocaleString(),  color: '#ef4444', icon: <XCircle size={14} /> },
            { label: 'Commission',       value: `$${agentComm.toFixed(2)}`,    color: '#f59e0b', icon: <DollarSign size={14} /> },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: '14px 20px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid #f1f5f9' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{s.label}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Success rate bar */}
        <div style={{
          padding: '12px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 12, background: '#fafafa'
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Success Rate (All Time)</span>
          <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4 }}>
            <div style={{
              height: '100%', borderRadius: 4, background: parseFloat(successRate) > 70 ? '#22c55e' : '#f59e0b',
              width: `${successRate}%`, transition: 'width 0.5s ease'
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{successRate}%</span>
        </div>

        {/* OTP log table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Number', 'Service', 'Country', 'Status', 'Time', 'Earnings'].map(h => (
                  <th key={h} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#94a3b8', padding: '8px 16px', textAlign: 'left', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOTPs.map(otp => (
                <tr key={otp.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50">
                  <td style={{ padding: '11px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                    {otp.number}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                      background: '#ede9fe', color: '#6366f1'
                    }}>{otp.service}</span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#475569' }}>{otp.country}</td>
                  <td style={{ padding: '11px 16px' }}>
                    {otp.status === 'success' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#dcfce7', color: '#16a34a'
                      }}>
                        <CheckCircle size={10} /> SUCCESS
                      </span>
                    ) : otp.status === 'pending' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#fef3c7', color: '#b45309'
                      }}>
                        <Clock size={10} /> PENDING
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#fee2e2', color: '#dc2626'
                      }}>
                        <XCircle size={10} /> FAILED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: 12, color: '#64748b' }}>{otp.time}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>· {otp.date}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {otp.earnings > 0 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 13, fontWeight: 700, color: '#22c55e'
                      }}>
                        <ArrowUpRight size={12} /> +${otp.earnings.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOTPs.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No OTPs found
            </div>
          )}
        </div>
      </div>

      {/* Commission breakdown */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Commission Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', margin: '0 0 8px' }}>Total User Revenue</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>${totalRevenue.toFixed(2)}</p>
          </div>
          <div style={{ padding: '16px', background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', margin: '0 0 8px' }}>Commission Rate</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>{user?.commission || 10}%</p>
          </div>
          <div style={{ padding: '16px', background: '#faf5ff', borderRadius: 12, border: '1px solid #e9d5ff', position: 'relative' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', margin: '0 0 8px' }}>My Earnings</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed', margin: 0 }}>${agentComm.toFixed(2)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <ArrowUpRight size={12} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Added to your balance automatically</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
