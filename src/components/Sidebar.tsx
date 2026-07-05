import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Hash, Terminal, BarChart2,
  ListChecks, Radio, Code2, Settings2, Newspaper, Key,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { onDataUpdated } from '../lib/socket'
import { notifyGeneral } from '../lib/notificationService'

export const SIDEBAR_EXPANDED  = 220
export const SIDEBAR_COLLAPSED = 56

// localStorage key: stores the ISO timestamp of the last news post the user has seen
const LAST_SEEN_NEWS_KEY = 'bittx_last_seen_newsfeed'

/* ── Logo ── */
function BitLogo() {
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

interface NavItem { to: string; icon: React.ReactNode; label: string }

const dialerItems: NavItem[] = [
  { to: '/get-number',   icon: <Hash size={16} />,       label: 'Get Number'     },
  { to: '/console',      icon: <Terminal size={16} />,   label: 'Console'        },
  { to: '/summary',      icon: <BarChart2 size={16} />,  label: 'Summary'        },
  { to: '/access-list',  icon: <ListChecks size={16} />, label: 'Access List'    },
  { to: '/sender-range', icon: <Radio size={16} />,      label: 'Sender / Range' },
  { to: '/newsfeed',     icon: <Newspaper size={16} />,  label: 'News Feed'      },
  { to: '/api-key',      icon: <Key size={16} />,        label: 'API Key Access' },
]

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink to={item.to} title={collapsed ? item.label : undefined}
      style={{ display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '10px 0' : '8px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8, fontSize: 14, fontWeight: 500,
        textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s',
      }}
      className={({ isActive }) =>
        isActive
          ? 'bg-accent text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }
    >
      <span style={{ flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ mobileOpen = false, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { setTweaksOpen, accentColor, sidebarCollapsed, t } = useTheme()
  const navigate = useNavigate()
  const w = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  // ── New News badge ──────────────────────────────────────────
  const [hasNewNews, setHasNewNews] = useState(false)
  const [newNewsCount, setNewNewsCount] = useState(0)

  // On mount: check if there are any posts newer than last-seen timestamp
  useEffect(() => {
    const checkNewNews = async () => {
      try {
        const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
        const token = (() => {
          for (const tag of ['admin','agent','user']) {
            const t = localStorage.getItem(`bittx_token_${tag}`)
            if (t) return t
          }
          return null
        })()
        if (!token) return

        const res = await fetch(`${BASE}/admin/newsfeed`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const data = await res.json()
        const posts = (data?.posts || []).filter((p: any) => p.published)

        const lastSeen = localStorage.getItem(LAST_SEEN_NEWS_KEY)
        const lastSeenDate = lastSeen ? new Date(lastSeen) : null

        const newOnes = posts.filter((p: any) => {
          if (!lastSeenDate) return true
          const postDate = new Date(p.createdAt || p.updatedAt || 0)
          return postDate > lastSeenDate
        })
        setHasNewNews(newOnes.length > 0)
        setNewNewsCount(newOnes.length)
      } catch {}
    }
    checkNewNews()
  }, [])

  // Listen for new newsfeed updates via socket
  useEffect(() => {
    const unsub = onDataUpdated((data: any) => {
      if (data?.type === 'newsfeed') {
        setHasNewNews(true)
        setNewNewsCount(p => p + 1)
        // Fire browser notification
        notifyGeneral('📰 BITTX SMS — New Post!', 'A new news post has been published. Check the News Feed.')
      }
    })
    return unsub
  }, [])

  // Translation helper for nav labels
  const getNavLabel = (label: string): string => {
    const labelMap: Record<string, string> = {
      'Get Number': t.getNumber,
      'Console': t.console,
      'Summary': t.summary,
      'Access List': t.accessList,
      'Sender / Range': t.senderRange,
    }
    return labelMap[label] || label
  }

  return (
    <aside style={{
      width: w, minWidth: w,
      height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 30,
      display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)',
      fontFamily: "'Inter',system-ui,sans-serif",
      transition: 'width 0.25s ease, min-width 0.25s ease, transform 0.3s ease',
      overflow: 'hidden',
    }}
    className={`sidebar-desktop ${mobileOpen ? 'mobile-sidebar-open' : 'mobile-sidebar-closed'}`}
    >

      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center',
        gap: sidebarCollapsed ? 0 : 12,
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        padding: sidebarCollapsed ? '14px 7px' : '14px 16px',
        borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}
        className="dark:border-slate-800">
        <BitLogo />
        {!sidebarCollapsed && (
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px',
            whiteSpace: 'nowrap', lineHeight: 1.2 }}
            className="text-slate-900 dark:text-white">
            BITTX SMS.
          </span>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: sidebarCollapsed ? '12px 7px' : '12px 10px',
        display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Dashboard */}
        <NavLink to="/dashboard" title={sidebarCollapsed ? t.dashboard : undefined}
          style={{ display: 'flex', alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 10,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            padding: sidebarCollapsed ? '10px 0' : '8px 12px',
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s',
          }}
          className={({ isActive }) =>
            isActive
              ? 'bg-accent text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }
        >
          <LayoutDashboard size={16} style={{ flexShrink: 0 }} />
          {!sidebarCollapsed && <span>{t.dashboard}</span>}
        </NavLink>

        {/* Dialer Panel */}
        <div>
          {!sidebarCollapsed && (
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}
              className="text-slate-400 dark:text-slate-600">{t.dialerPanel}</p>
          )}
          {sidebarCollapsed && <div style={{ height: 4 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialerItems.map(item => {
              const isNewsFeed = item.to === '/newsfeed'
              return (
                <NavLink key={item.to} to={item.to}
                  title={sidebarCollapsed ? getNavLabel(item.label) : undefined}
                  onClick={() => {
                    // Mark news as seen when user navigates to News Feed
                    if (isNewsFeed) {
                      localStorage.setItem(LAST_SEEN_NEWS_KEY, new Date().toISOString())
                      setHasNewNews(false)
                      setNewNewsCount(0)
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center',
                    gap: sidebarCollapsed ? 0 : 10,
                    padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    borderRadius: 8, fontSize: 14, fontWeight: 500,
                    textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  className={({ isActive }) =>
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                >
                  <span style={{ flexShrink: 0, position: 'relative' }}>
                    {item.icon}
                    {/* Red dot on icon when collapsed */}
                    {isNewsFeed && hasNewNews && sidebarCollapsed && (
                      <span style={{
                        position: 'absolute', top: -3, right: -3,
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#ef4444', border: '1.5px solid var(--bg-sidebar)',
                        flexShrink: 0,
                      }} />
                    )}
                  </span>
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{getNavLabel(item.label)}</span>
                      {/* NEW badge when expanded */}
                      {isNewsFeed && hasNewNews && (
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          padding: '1px 6px', borderRadius: 20,
                          background: '#ef4444', color: '#fff',
                          letterSpacing: '0.04em', flexShrink: 0,
                          animation: 'pulse 2s infinite',
                        }}>
                          {newNewsCount > 0 ? `${newNewsCount} NEW` : 'NEW'}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Bottom ── */}
      <div style={{ padding: sidebarCollapsed ? '10px 7px 14px' : '10px 10px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        borderTop: '1px solid #e2e8f0', flexShrink: 0 }}
        className="dark:border-slate-800">

        {/* Tweaks */}
        <button onClick={() => setTweaksOpen(true)}
          title={sidebarCollapsed ? t.tweaks : undefined}
          style={{ display: 'flex', alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 10,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            padding: sidebarCollapsed ? '10px 0' : '8px 12px',
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            border: 'none', cursor: 'pointer', width: '100%',
          }}
          className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <Settings2 size={16} />
          {!sidebarCollapsed && <span>{t.tweaks}</span>}
        </button>

        {/* DEV card — hidden when collapsed */}
        {!sidebarCollapsed && (
          <div style={{ borderRadius: 12, padding: 12, border: '1px solid #f1f5f9' }}
            className="bg-slate-50 dark:bg-slate-800/80 dark:border-slate-700">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: accentColor }}>DEV</span>
              <Code2 size={13} className="text-slate-400" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
              className="text-slate-800 dark:text-slate-200">{t.developer}?</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ fontSize: 11, lineHeight: 1.4 }} className="text-slate-400 dark:text-slate-500">
                {t.seeApiDocs}
              </p>
              <button onClick={() => navigate('/api-docs')}
                style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  backgroundColor: accentColor, color: '#fff', border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t.view}
              </button>
            </div>
          </div>
        )}

        {/* DEV icon when collapsed */}
        {sidebarCollapsed && (
          <button onClick={() => navigate('/api-docs')} title={t.developer}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              width: '100%' }}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Code2 size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
