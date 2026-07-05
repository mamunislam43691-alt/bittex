import { useState, useEffect, useRef } from 'react'
import { Search, Clock, User, CreditCard, LogOut, ChevronDown, DollarSign, Bell, BellOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import LogoutModal from './LogoutModal'
import { requestPermission, getPermission } from '../lib/notificationService'

function UtcClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = pad(time.getUTCHours()), m = pad(time.getUTCMinutes()), s = pad(time.getUTCSeconds())
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateStr = `${time.getUTCDate()} ${months[time.getUTCMonth()]}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={13} style={{ color: '#94a3b8' }} />
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{h}:{m}:{s}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>UTC+0</span>
      <span style={{ color: 'var(--border)', margin: '0 2px' }}>·</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateStr}</span>
    </div>
  )
}

interface TopbarProps { sidebarWidth: number; onMenuClick?: () => void }

export default function Topbar({ sidebarWidth, onMenuClick }: TopbarProps) {
  const { accentColor, photoUrl } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const dropRef = useRef<HTMLDivElement>(null)

  // Notification permission state
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')
  const [notifTooltip, setNotifTooltip] = useState(false)
  const [notifAnim, setNotifAnim] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(getPermission())
  }, [])

  const handleNotifClick = async () => {
    if (notifPerm === 'granted') {
      // Already on — show tooltip info
      setNotifTooltip(true)
      setTimeout(() => setNotifTooltip(false), 2500)
      return
    }
    const result = await requestPermission()
    setNotifPerm(result)
    if (result === 'granted') {
      // Show success animation
      setNotifAnim(true)
      setTimeout(() => setNotifAnim(false), 1200)
      // Fire a test notification so user knows it works
      try {
        new Notification('✅ BITTX SMS — Notifications enabled!', {
          body: 'You will now get alerts when OTPs arrive.',
          icon: '/favicon.svg',
          tag: 'bittx-permission-test',
        })
      } catch {}
    }
  }

  // Derive display name from auth user
  const displayName = user
    ? (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.username || user.email?.split('@')[0] || 'User')
    : 'User'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const initial = (displayName?.[0] || 'U').toUpperCase()

  return (
    <header
      className="fixed top-0 right-0 h-12 flex items-center px-5 gap-4 z-20"
      style={{
        left: isMobile ? 0 : sidebarWidth,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        transition: 'left 0.25s ease',
      }}>

      {/* Hamburger — shown on mobile, triggers sidebar */}
      <button
        onClick={onMenuClick}
        className="mobile-hamburger-topbar"
        style={{ display: isMobile ? 'flex' : 'none', width:34, height:34, borderRadius:9,
          border:'1px solid var(--border)', background:'var(--bg-card)',
          cursor:'pointer', alignItems:'center', justifyContent:'center',
          flexShrink:0, marginRight: 4 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect y="2" width="16" height="2" rx="1" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
          <rect y="7" width="16" height="2" rx="1" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
          <rect y="12" width="16" height="2" rx="1" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
        </svg>
      </button>

      {/* Search */}
      <div style={{ position: 'relative', width: 220 }} className="topbar-search">
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input type="text" placeholder="Search"
          style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
            fontSize: 13, borderRadius: 8, border: '1px solid transparent',
            background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Clock */}
      <UtcClock />

      {/* Notification bell */}
      {'Notification' in window && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleNotifClick}
            title={
              notifPerm === 'granted' ? 'OTP notifications ON'
              : notifPerm === 'denied' ? 'Notifications blocked — enable in browser settings'
              : 'Click to enable OTP notifications'
            }
            style={{
              width: 34, height: 34, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${notifPerm === 'granted' ? '#86efac' : 'var(--border)'}`,
              background: notifPerm === 'granted' ? '#f0fdf4' : 'var(--bg-card)',
              cursor: notifPerm === 'denied' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              animation: notifAnim ? 'spin 0.5s ease' : 'none',
              position: 'relative',
            }}
          >
            {notifPerm === 'granted'
              ? <Bell size={15} style={{ color: '#16a34a' }} />
              : notifPerm === 'denied'
                ? <BellOff size={15} style={{ color: '#94a3b8' }} />
                : <Bell size={15} style={{ color: '#f59e0b' }} />
            }
            {/* Green dot indicator when active */}
            {notifPerm === 'granted' && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: '#22c55e',
                border: '1.5px solid var(--bg-card)',
                animation: 'pulse 2s infinite',
              }} />
            )}
            {/* Yellow dot — permission not yet requested */}
            {notifPerm === 'default' && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: '#f59e0b',
                border: '1.5px solid var(--bg-card)',
              }} />
            )}
          </button>

          {/* Tooltip */}
          {notifTooltip && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'rgba(15,23,42,0.92)', color: '#fff',
              fontSize: 12, fontWeight: 600, padding: '6px 12px',
              borderRadius: 8, whiteSpace: 'nowrap', zIndex: 100,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              ✅ OTP notifications are ON
              <span style={{
                position: 'absolute', bottom: '100%', right: 14,
                width: 0, height: 0,
                borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                borderBottom: '5px solid rgba(15,23,42,0.92)',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Balance badge — only for regular users */}
      {user?.role === 'user' && (
        <>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button
            onClick={() => navigate('/payment')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 12px 4px 8px', borderRadius: 20,
              background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
              border: '1px solid #86efac', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="View balance / withdraw">
            <DollarSign size={13} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
              {(user?.balance ?? 0).toFixed(2)}
            </span>
          </button>
        </>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Profile avatar + dropdown */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button onClick={() => setDropOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px',
            borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)',
            cursor: 'pointer', transition: 'all 0.15s' }}
          className="hover:border-violet-300 dark:hover:border-violet-600">
          {/* Avatar */}
          {photoUrl ? (
            <img src={photoUrl} alt="avatar"
              style={{ width: 28, height: 28, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</span>
          <ChevronDown size={13} style={{ color: '#94a3b8', transform: dropOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s' }} />
        </button>

        {/* Dropdown */}
        {dropOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 200,
            background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 50 }}>
            {/* User info header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{displayName}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>BITTX SMS Account</p>
              {user?.role === 'user' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
                  background: '#f0fdf4', borderRadius: 8, padding: '4px 8px', width: 'fit-content' }}>
                  <DollarSign size={11} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                    {(user?.balance ?? 0).toFixed(2)} USDT
                  </span>
                </div>
              )}
            </div>
            {/* Menu items */}
            {[
              { icon: <User size={14}/>, label: 'Profile',  path: '/profile'  },
              { icon: <CreditCard size={14}/>, label: 'Payment', path: '/payment' },
            ].map(item => (
              <button key={item.path}
                onClick={() => { navigate(item.path); setDropOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', fontSize: 13, fontWeight: 500, border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  color: 'var(--text-secondary)' }}
                className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
            <button
              onClick={() => { setDropOpen(false); setShowLogout(true) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', fontSize: 13, fontWeight: 500, border: 'none',
                background: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444' }}
              className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>
      {/* Logout confirmation modal */}
      {showLogout && <LogoutModal onClose={() => setShowLogout(false)} />}
    </header>
  )
}
