import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar, { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from './Sidebar'
import Topbar from './Topbar'
import TweaksPanel from './TweaksPanel'
import { useTheme } from '../context/ThemeContext'
import { adminApi } from '../lib/api'
import { X, Megaphone, Bell } from 'lucide-react'
import { requestPermission, getPermission, notifyGeneral } from '../lib/notificationService'
import { onNewAnnouncement } from '../lib/socket'

const LAST_SEEN_ANN_KEY = 'bittx_last_seen_announcement'

const TYPE_COLORS = {
  info:    { bg: 'linear-gradient(135deg,#dbeafe,#eff6ff)', border: '#93c5fd', text: '#1d4ed8', badge: '#dbeafe', badgeText: '#1e40af' },
  warning: { bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)', border: '#fcd34d', text: '#92400e', badge: '#fef3c7', badgeText: '#92400e' },
  success: { bg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)', border: '#86efac', text: '#14532d', badge: '#dcfce7', badgeText: '#166534' },
  danger:  { bg: 'linear-gradient(135deg,#fee2e2,#fff5f5)', border: '#fca5a5', text: '#7f1d1d', badge: '#fee2e2', badgeText: '#991b1b' },
}

function AnnouncementPopup() {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(0)
  const [dontShowToday, setDontShowToday] = useState(false)
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([])
  // In-memory set of dismissed announcement IDs (session only — no localStorage)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const todayKey = () => new Date().toISOString().slice(0, 10)
  const hideKey = (id: string) => `${id}_${todayKey()}`

  useEffect(() => {
    adminApi.announcements()
      .then((res: any) => setAllAnnouncements(res?.announcements || []))
      .catch(() => {})
    // Clean up old localStorage announcement keys from previous version
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ann_hide_'))
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  const activeAnnouncements = allAnnouncements.filter(a => {
    if (!a.active) return false
    return !dismissedIds.has(hideKey(a._id || a.id))
  })

  useEffect(() => {
    if (activeAnnouncements.length === 0) return
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAnnouncements.length])

  // Reset dontShowToday when switching to a new announcement
  useEffect(() => { setDontShowToday(false) }, [current])

  const dismissCurrent = () => {
    if (dontShowToday) {
      const ann = activeAnnouncements[current]
      setDismissedIds(prev => new Set(prev).add(hideKey(ann._id || ann.id)))
    }
  }

  const handleGotIt = () => {
    dismissCurrent()
    if (current < activeAnnouncements.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setVisible(false)
    }
  }

  const handleClose = () => {
    dismissCurrent()
    setVisible(false)
  }

  if (!visible || activeAnnouncements.length === 0) return null

  const ann = activeAnnouncements[current]
  const c = TYPE_COLORS[ann.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.info

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 480, maxWidth: '95vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden', animation: 'slideUp 0.25s ease',
      }}>
        {/* Colored header */}
        <div style={{
          background: c.bg, borderBottom: `1px solid ${c.border}`,
          padding: '20px 22px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.border}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Megaphone size={20} style={{ color: c.text }}/>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: c.badgeText, background: c.badge, padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 4 }}>
                  {ann.type.toUpperCase()}
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: c.text, margin: 0, lineHeight: 1.3 }}>{ann.title}</h3>
              </div>
            </div>
            <button onClick={handleClose}
              style={{ background: `${c.border}40`, border: 'none', cursor: 'pointer', borderRadius: 8,
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.text, flexShrink: 0, marginLeft: 8 }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{ann.message}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}</p>
          {/* Action Button */}
          {ann.buttonText && ann.buttonUrl && (
            <a
              href={ann.buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 14, padding: '9px 18px', borderRadius: 9,
                background: c.border, color: c.text,
                fontWeight: 700, fontSize: 13, textDecoration: 'none',
                border: `1.5px solid ${c.border}`,
                boxShadow: `0 2px 8px ${c.border}50`,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {ann.buttonText}
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', gap: 12 }}>

          {/* Left: Don't show again today */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
            {/* Custom checkbox */}
            <div
              onClick={() => setDontShowToday(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${dontShowToday ? c.border : '#cbd5e1'}`,
                background: dontShowToday ? c.border : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {dontShowToday && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 12, color: dontShowToday ? '#475569' : '#94a3b8',
              fontWeight: dontShowToday ? 600 : 400, transition: 'all 0.15s',
              userSelect: 'none' }}>
              Don't show again today
            </span>
          </label>

          {/* Right: dots + buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeAnnouncements.length > 1 && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {activeAnnouncements.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 4, border: 'none',
                      cursor: 'pointer', padding: 0,
                      background: i === current ? c.border : '#e2e8f0', transition: 'all 0.2s' }}/>
                ))}
              </div>
            )}
            <button onClick={handleGotIt}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: 'none', background: c.border, color: c.text, cursor: 'pointer',
                whiteSpace: 'nowrap' }}>
              {current < activeAnnouncements.length - 1 ? 'Next →' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const { sidebarCollapsed } = useTheme()
  const sidebarW = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  // Notification permission banner
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const NOTIF_DISMISSED_KEY = 'bittx_notif_banner_dismissed'

  useEffect(() => {
    // Show banner if permission is "default" (not yet asked) and user hasn't dismissed it
    if (!('Notification' in window)) return
    const dismissed = localStorage.getItem(NOTIF_DISMISSED_KEY)
    if (!dismissed && getPermission() === 'default') {
      // Delay slightly so page loads first
      const t = setTimeout(() => setShowNotifBanner(true), 2000)
      return () => clearTimeout(t)
    }
  }, [])

  const handleEnableNotif = async () => {
    setShowNotifBanner(false)
    const result = await requestPermission()
    if (result === 'granted') {
      try {
        new Notification('✅ BITTX SMS — Notifications enabled!', {
          body: 'You will now receive alerts when your OTPs arrive.',
          icon: '/favicon.svg',
          tag: 'bittx-welcome',
        })
      } catch {}
    }
  }

  const dismissNotifBanner = () => {
    setShowNotifBanner(false)
    // Remember for 7 days
    try {
      localStorage.setItem(NOTIF_DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    } catch {}
  }

  // 🔔 Listen for new announcements via socket — fire notification
  useEffect(() => {
    const unsub = onNewAnnouncement((data: any) => {
      const annId = String(data?._id || data?.id || '')
      const lastSeen = localStorage.getItem(LAST_SEEN_ANN_KEY)
      if (annId && lastSeen === annId) return  // already notified for this one
      if (annId) localStorage.setItem(LAST_SEEN_ANN_KEY, annId)

      const title   = data?.title   || 'New Announcement'
      const message = data?.message || 'The admin has posted a new announcement.'
      notifyGeneral(`📢 ${title}`, message)
    })
    return unsub
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setMobileOpen(false) }, [])

  // Track mobile breakpoint
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:29 }}
        />
      )}

      {/* 🔔 Notification permission banner */}
      {showNotifBanner && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: 'min(480px, calc(100vw - 32px))',
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: 16, padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'slideUp 0.35s ease',
          border: '1px solid rgba(139,92,246,0.4)',
        }}>
          {/* Bell icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(139,92,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={22} style={{ color: '#a78bfa' }} />
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 3px' }}>
              Enable OTP Notifications 🔔
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.4 }}>
              Get instant alerts + sound when your OTP arrives
            </p>
          </div>
          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleEnableNotif}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Enable
            </button>
            <button
              onClick={dismissNotifBanner}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}/>
      <Topbar sidebarWidth={sidebarW} onMenuClick={() => setMobileOpen(v=>!v)}/>
      <main
        style={{
          marginLeft: isMobile ? 0 : sidebarW,
          marginTop: 48,
          transition: 'margin-left 0.25s ease',
          minWidth: 0,
          width: isMobile ? '100%' : `calc(100% - ${sidebarW}px)`,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
        className="min-h-[calc(100vh-48px)] mobile-main">
        <Outlet />
      </main>
      <TweaksPanel />
      <AnnouncementPopup />
    </div>
  )
}
