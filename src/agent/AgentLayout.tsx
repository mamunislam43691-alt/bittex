import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, DollarSign, LogOut, ChevronLeft, ChevronRight,
  Terminal, Newspaper, MessageSquare, Key, User, CreditCard, Code2, BookOpen, Menu, Clock,
  FileText, BarChart3,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import LogoutModal from '../components/LogoutModal'

const mainNavItems = [
  { label: 'Dashboard',      icon: <LayoutDashboard size={16}/>, to: '/agent' },
  { label: 'My Users',       icon: <Users size={16}/>,           to: '/agent/users' },
  { label: 'Pending Users',  icon: <Clock size={16}/>,           to: '/agent/pending' },
  { label: 'Daily Report',   icon: <FileText size={16}/>,        to: '/agent/daily-report' },
  { label: 'Analytics',      icon: <BarChart3 size={16}/>,       to: '/agent/analytics' },
  { label: 'Commission',     icon: <DollarSign size={16}/>,      to: '/agent/commission' },
  { label: 'OTP Monitor',    icon: <Terminal size={16}/>,        to: '/agent/monitor' },
  { label: 'API Key',        icon: <Key size={16}/>,             to: '/agent/api-key' },
  { label: 'News Feed',      icon: <Newspaper size={16}/>,       to: '/agent/newsfeed' },
  { label: 'Support',        icon: <MessageSquare size={16}/>,   to: '/agent/support' },
]  

function AgentLogo() {
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

export default function AgentLayout() {
  const navigate = useNavigate()
  const { accentColor } = useTheme()
  const { user } = useAuth()
  const { sidebarCollapsed, setSidebarCollapsed } = useTheme()
  // Keep a local alias so the rest of the file doesn't need to rename every reference.
  const collapsed = sidebarCollapsed
  const setCollapsed = setSidebarCollapsed
  const [showLogout, setShowLogout] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const w = collapsed ? 56 : 220

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Agent'

  const navLinkStyle = (isActive: boolean) => ({
    display: 'flex', alignItems: 'center' as const,
    gap: collapsed ? 0 : 10,
    justifyContent: collapsed ? 'center' as const : 'flex-start' as const,
    padding: collapsed ? '10px 0' : '9px 12px',
    borderRadius: 8, fontSize: 13, fontWeight: 500,
    textDecoration: 'none', whiteSpace: 'nowrap' as const, transition: 'all 0.15s',
    background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: isActive ? '#a5b4fc' : '#9ca3af',
    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
  })

  return (
    <div className="big-ui" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {showLogout && <LogoutModal onClose={() => setShowLogout(false)} />}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:29 }}/>
      )}

      <aside style={{ width: w, minWidth: w, height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 30,
        background: '#1a1a3e', display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease, transform 0.3s ease', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)' }}
        className={mobileOpen ? 'mobile-open' : ''}
      >

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '14px 9px' : '14px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <AgentLogo />
          {!collapsed && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>BITTX Agent</p>
              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Agent Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 4px' : '6px 8px',
          display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Main items */}
          {mainNavItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/agent'}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => navLinkStyle(isActive)}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Account section */}
          {!collapsed && (
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#4b5563', padding: '12px 12px 4px',
              margin: '6px 0 0' }}>
              Account
            </p>
          )}
          {collapsed && <div style={{ height: 10, borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }}/>}

          <NavLink to="/agent/profile" title={collapsed ? 'Profile' : undefined}
            style={({ isActive }) => navLinkStyle(isActive)}>
            <User size={16} style={{ flexShrink: 0 }}/>
            {!collapsed && <span>Profile</span>}
          </NavLink>

          <NavLink to="/agent/payment" title={collapsed ? 'Payment' : undefined}
            style={({ isActive }) => navLinkStyle(isActive)}>
            <CreditCard size={16} style={{ flexShrink: 0 }}/>
            {!collapsed && <span>Payment</span>}
          </NavLink>
        </nav>

        {/* Bottom: DEV card + User Panel + Logout */}
        <div style={{ padding: collapsed ? '8px 8px 14px' : '8px 8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* DEV card */}
          {!collapsed && (
            <div style={{ borderRadius: 10, padding: '10px 12px', marginBottom: 6,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#6366f1' }}>DEV</span>
                <Code2 size={12} style={{ color: '#6b7280' }}/>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', marginBottom: 6 }}>Are you a developer?</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, margin: 0 }}>See the API documentation</p>
                <button onClick={() => navigate('/agent/api-docs')}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  View
                </button>
              </div>
            </div>
          )}
          {collapsed && (
            <button onClick={() => navigate('/agent/api-docs')} title="API Docs"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(99,102,241,0.12)', color: '#6366f1', width: '100%' }}>
              <BookOpen size={16}/>
            </button>
          )}

          {/* Logout */}
          <button onClick={() => setShowLogout(true)} title={collapsed ? 'Logout' : undefined}
            style={{ width: '100%', padding: collapsed ? '10px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: 'none', color: '#f87171', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8 }}>
            <LogOut size={15}/>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ position: 'absolute', top: 58, right: -12, width: 24, height: 24, borderRadius: '50%',
            background: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 40, color: '#9ca3af' }}>
          {collapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
        </button>
      </aside>

      <div style={{ marginLeft: w, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s ease' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff',
          borderBottom: '1px solid #e2e8f0', height: 52,
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v=>!v)}
            className="mobile-hamburger"
            style={{ display:'none', width:34, height:34, borderRadius:8, border:'1px solid #e2e8f0',
              background:'#fff', cursor:'pointer', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Menu size={16} style={{ color:'#64748b' }}/>
          </button>
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px',
            borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid #c7d2fe' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>AGENT</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{displayName}</span>
          </div>
        </header>
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
