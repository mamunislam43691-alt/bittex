import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCog, CreditCard, Megaphone,
  Settings, Shield, BarChart3, Terminal, LogOut, ChevronLeft,
  ChevronRight, Bell, Search, Menu, Newspaper, MessageSquare, ShieldCheck, Server, Database
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { withdrawalsApi, api } from '../lib/api'
import { onDataUpdated } from '../lib/socket'
import LogoutModal from '../components/LogoutModal'

const navItems = [
  { label: 'Dashboard',    icon: <LayoutDashboard size={16}/>, to: '/admin', perm: '' },
  { label: 'Users',        icon: <Users size={16}/>,            to: '/admin/users', perm: 'user_view' },
  { label: 'Agents',       icon: <UserCog size={16}/>,          to: '/admin/agents', perm: 'agent_view' },
  { label: 'Admins',       icon: <ShieldCheck size={16}/>,      to: '/admin/admins', perm: 'role_manage' },
  { label: 'Roles',        icon: <Shield size={16}/>,           to: '/admin/roles', perm: 'role_manage' },
  { label: 'Service Provider', icon: <Server size={16}/>,       to: '/admin/service-provider', perm: 'system_settings' },
  { label: 'Withdrawals',  icon: <CreditCard size={16}/>,       to: '/admin/withdrawals', badge: true, perm: 'withdrawal_view' },
  { label: 'Analytics',    icon: <BarChart3 size={16}/>,        to: '/admin/analytics', perm: 'analytics' },
  { label: 'OTP Monitor',  icon: <Terminal size={16}/>,         to: '/admin/monitor', perm: 'otp_monitor' },
  { label: 'Announcements',icon: <Megaphone size={16}/>,        to: '/admin/announcements', perm: 'announcement_view' },
  { label: 'News Feed',    icon: <Newspaper size={16}/>,        to: '/admin/newsfeed', perm: 'newsfeed_view' },
  { label: 'Support',      icon: <MessageSquare size={16}/>,    to: '/admin/support', badge: true, perm: 'ticket_view' },
  { label: 'Database',     icon: <Database size={16}/>,         to: '/admin/database', perm: 'database_manage' },
  { label: 'Settings',     icon: <Settings size={16}/>,         to: '/admin/settings', perm: 'system_settings' },
] 

function AdminLogo() {
  return (
    <div style={{
      width: 38, height: 38, minWidth: 38, borderRadius: 11,
      background: 'linear-gradient(135deg,#ec4899 0%,#a78bfa 30%,#34d399 65%,#fbbf24 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 14px rgba(167,139,250,0.5)', flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontWeight: 900, fontSize: 22, color: '#fff',
        textShadow: '0 1px 4px rgba(0,0,0,0.35)',
        lineHeight: 1, userSelect: 'none',
      }}>B</span>
    </div>
  )
}

export default function AdminLayout() {
  const { accentColor, sidebarCollapsed, setSidebarCollapsed } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [pendingSupport, setPendingSupport] = useState(0)
  const w = sidebarCollapsed ? 56 : 220

  const fetchBadges = async () => {
    try {
      const [wData, sData] = await Promise.all([
        withdrawalsApi.list('pending').catch(() => ({ withdrawals: [] })),
        api.get('/admin/support').catch(() => ({ tickets: [] })),
      ])
      setPendingWithdrawals((wData?.withdrawals || []).length)
      const allTickets = sData?.tickets || []
      setPendingSupport(allTickets.filter((t: any) => t.status === 'open').length)
    } catch {}
  }

  useEffect(() => { fetchBadges() }, [])
  useEffect(() => {
    const interval = setInterval(fetchBadges, 15000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (['withdrawals', 'support', 'tickets'].includes(data.type)) fetchBadges()
    })
    return unsub
  }, [])

  const badges: Record<string, number> = {
    '/admin/withdrawals': pendingWithdrawals,
    '/admin/support': pendingSupport,
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Admin'
  const roleLabel = user?.role === 'superadmin' ? 'SUPER ADMIN' : (user?.role ?? 'ADMIN').toUpperCase()

  return (
    <div className="big-ui" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {showLogout && <LogoutModal onClose={() => setShowLogout(false)} />}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:29 }}/>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: w, minWidth: w, height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 30,
        background: '#1e1e2e', display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease, transform 0.3s ease', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
      className={mobileOpen ? 'mobile-open' : ''}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: sidebarCollapsed ? '14px 9px' : '14px 16px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <AdminLogo />
          {!sidebarCollapsed && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>BITTX Admin</p>
              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{user?.role === 'superadmin' ? 'Super Admin' : (user?.role ?? 'Admin').charAt(0).toUpperCase() + (user?.role ?? 'admin').slice(1)} Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px',
          display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.filter(item => {
            if (!item.perm) return true
            const userPerms = (user as any)?.permissions || []
            if (userPerms.includes('all_access')) return true
            return userPerms.includes(item.perm)
          }).map(item => {
            const count = badges[item.to] || 0
            return (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
              title={sidebarCollapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 10,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                padding: sidebarCollapsed ? '10px 0' : '9px 12px',
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: isActive ? 'rgba(239,68,68,0.15)' : 'transparent',
                color: isActive ? '#f87171' : '#9ca3af',
                borderLeft: isActive ? '3px solid #ef4444' : '3px solid transparent',
                position: 'relative',
              })}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!sidebarCollapsed && count > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
                  background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{count}</span>
              )}
              {sidebarCollapsed && count > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{count}</span>
              )}
            </NavLink>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '8px 8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setShowLogout(true)}
            title={sidebarCollapsed ? 'Logout' : undefined}
            style={{ width: '100%', padding: sidebarCollapsed ? '10px 0' : '8px 12px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: 'none', color: '#f87171',
              display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 8 }}>
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{ position: 'absolute', top: 58, right: -12, width: 24, height: 24,
            borderRadius: '50%', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 40, color: '#9ca3af' }}>
          {sidebarCollapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft: w, flex: 1, display: 'flex', flexDirection: 'column',
        transition: 'margin-left 0.25s ease', minHeight: '100vh' }}>

        {/* Topbar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 20,
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          height: 52, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v=>!v)}
            className="mobile-hamburger"
            style={{ display:'none', width:34, height:34, borderRadius:8, border:'1px solid #e2e8f0',
              background:'#fff', cursor:'pointer', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Menu size={16} style={{ color:'#64748b' }}/>
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <Menu size={18}/>
          </button>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#94a3b8' }}/>
            <input placeholder="Search users, agents..."
              style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}/>
          </div>
          <div style={{ flex: 1 }}/>
          {/* Notification bell */}
          <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <Bell size={18}/>
            <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8,
              borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }}/>
          </button>
          {/* Admin badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px',
            borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid #fecaca' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{roleLabel}</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
