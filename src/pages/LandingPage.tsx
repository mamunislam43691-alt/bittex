import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Moon, Sun, Menu, X, ChevronDown, Star, ArrowRight,
  Smartphone, Check, Activity, Lock, Cpu, ExternalLink,
  ChevronRight, Wifi, BarChart3, Shield, Code2, Globe,
  TrendingUp, Users, UserPlus, MessageSquare, Zap,
} from 'lucide-react'

// ─── Logo ────────────────────────────────────────────────────────────────────
function BittxLogo({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, minWidth: size, borderRadius: size * 0.28,
      background: 'linear-gradient(135deg,#ec4899 0%,#a78bfa 30%,#34d399 65%,#fbbf24 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 14px rgba(167,139,250,0.55)', flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontWeight: 900,
        fontSize: size * 0.56,
        color: '#fff',
        textShadow: '0 1px 4px rgba(0,0,0,0.35)',
        lineHeight: 1,
        userSelect: 'none',
      }}>B</span>
    </div>
  )
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', duration = 2000 }: {
  target: number; suffix?: string; duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setCount(target); clearInterval(timer) }
          else setCount(Math.floor(start))
        }, 16)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─── Service Icons (SVG inline) ───────────────────────────────────────────────
// ─── Real SVG Service Icons ───────────────────────────────────────────────────
const SERVICE_SVGS: Record<string, JSX.Element> = {
  Telegram: <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#229ED9"/><path fill="#fff" d="M5.5 11.5l11-4.5-1.5 9-3.5-2.5-2 2v-3l5-4.5-6.5 3.5-2.5-1z"/></svg>,
  WhatsApp: <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#25D366"/><path fill="#fff" d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 1.32.34 2.56.94 3.64L4.5 19.5l4-1.4A7.48 7.48 0 0 0 12 19.5c4.14 0 7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm3.6 10.3c-.15.42-1.12.82-1.55.87-.4.05-.9.07-1.44-.09-.34-.1-.77-.23-1.33-.46-2.34-1-3.87-3.36-3.99-3.52-.12-.16-.96-1.28-.96-2.44 0-1.16.6-1.73.82-1.97.21-.24.46-.3.61-.3l.44.01c.14 0 .33-.05.52.4.19.45.64 1.56.7 1.67.06.11.1.25.02.4-.08.15-.12.24-.23.37-.12.13-.25.3-.35.4-.12.12-.24.25-.1.49.14.24.6 1 1.28 1.61.88.8 1.62 1.05 1.86 1.17.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.56-.09.98z"/></svg>,
  Facebook: <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M15.1 7.5H13c-.3 0-.5.2-.5.5v2h2.6l-.4 2.5H12.5V19h-3v-6.5H7.5V10H9.5V8c0-2.2 1.3-3.5 3.3-3.5h2.3v3z"/></svg>,
  Instagram: <svg viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F58529"/><stop offset="50%" stopColor="#DD2A7B"/><stop offset="100%" stopColor="#8134AF"/></linearGradient></defs><rect width="24" height="24" rx="6" fill="url(#igGrad)"/><rect x="6.5" y="6.5" width="11" height="11" rx="3" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2.5" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="16" cy="8" r="0.75" fill="#fff"/></svg>,
  TikTok: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#010101"/><path fill="#fff" d="M16 7.5a3 3 0 0 1-3-3h-2v8.5a1.5 1.5 0 1 1-2-1.4V9.4A3.5 3.5 0 1 0 13 13V9.8A5 5 0 0 0 16 10V7.5z"/><path fill="#69C9D0" d="M16.5 7a3 3 0 0 0 .5.5A3 3 0 0 1 14 4.5V7a5 5 0 0 0 3 .9V5.5A3 3 0 0 1 16.5 7z" opacity=".6"/></svg>,
  Twitter: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#000"/><path fill="#fff" d="M17.5 5h2.1l-4.6 5.3L20.5 19h-4.2l-3.3-4.3L9.2 19H7.1l4.9-5.6L6.5 5h4.3l3 3.9L17.5 5zm-.7 12.4h1.2L7.3 6.2H6l10.8 11.2z"/></svg>,
  Messenger: <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="url(#msgrGrad)"/><defs><linearGradient id="msgrGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0062E0"/><stop offset="100%" stopColor="#19AFFF"/></linearGradient></defs><path fill="#fff" d="M12 4C7.58 4 4 7.3 4 11.4c0 2.22 1 4.2 2.6 5.54V19.5l2.4-1.32A8.56 8.56 0 0 0 12 18.8c4.42 0 8-3.3 8-7.4S16.42 4 12 4zm.8 9.96l-2.04-2.18-3.98 2.18 4.38-4.66 2.08 2.18 3.94-2.18-4.38 4.66z"/></svg>,
  Apple: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#555"/><path fill="#fff" d="M15.76 12.6c-.02-1.96 1.6-2.9 1.67-2.95-1.15-1.7-2.4-1.7-2.42-1.7 0 0-1.04-.12-2.04.68C12.03 9.45 11.47 9.5 11.1 9.5c-.37 0-.96-.09-1.9-.75-.98-.67-1.96-.56-1.96-.56-1.87.17-3.18 1.87-3.18 3.72 0 1.73.5 3.42 1.77 4.76.73.77 1.87 1.08 2.8.58.6-.3 1.26-.47 1.84-.47.58 0 1.24.17 1.83.47.95.5 2.1.17 2.8-.58 1.13-1.2 1.76-2.7 1.8-4.07a3.3 3.3 0 0 1-1.1-.5zm-1.38-5.96c.44-.59.74-1.37.66-2.16-.65.03-1.46.44-1.93 1.03-.42.5-.8 1.32-.7 2.07.72.06 1.47-.36 1.97-.94z"/></svg>,
  Google: <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#fff"/><path fill="#4285F4" d="M21.6 12.23c0-.63-.06-1.24-.16-1.82H12v3.45h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 3-4.32 3-7.16z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.92A5.96 5.96 0 0 1 6.08 12c0-.67.12-1.32.32-1.92V7.5H3.07A10 10 0 0 0 2 12c0 1.62.39 3.14 1.07 4.5l3.33-2.58z"/><path fill="#EA4335" d="M12 6.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A10 10 0 0 0 12 2 10 10 0 0 0 3.07 7.5l3.33 2.58C7.2 8.72 9.4 6.96 12 6.96z"/></svg>,
  YouTube: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#FF0000"/><path fill="#fff" d="M19.6 8.2s-.2-1.4-.8-2c-.76-.8-1.6-.8-2-.85C14.4 5.2 12 5.2 12 5.2s-2.4 0-4.8.15c-.4.05-1.24.05-2 .85-.6.6-.8 2-.8 2S4.2 9.76 4.2 11.32v1.46c0 1.56.2 3.12.2 3.12s.2 1.4.8 2c.76.8 1.76.77 2.2.85C8.8 18.9 12 18.9 12 18.9s2.4 0 4.8-.16c.4-.08 1.24-.05 2-.85.6-.6.8-2 .8-2s.2-1.56.2-3.12v-1.46c0-1.56-.2-3.12-.2-3.12zM10.2 14.6V9.6l5.4 2.5-5.4 2.5z"/></svg>,
  Snapchat: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#FFFC00"/><path fill="#000" d="M12 3.5c-2.5 0-4.5 2-4.5 4.5v1c-.5.2-1 .5-1 1s.5 1 1 1c-.1.4-.3.8-.6 1.2-.5.5-1.2.8-2 .8.2.5.9.8 1.6 1 .2.2.1.5-.5.8-.5.3-.4.8 0 .9.5.2 1.5.3 2.4 1 .6.4 1.2.8 3 .8s2.4-.4 3-1c1-.7 2-.8 2.5-1 .4-.1.5-.6 0-.9-.6-.3-.7-.6-.5-.8.7-.2 1.4-.5 1.6-1-.8 0-1.5-.3-2-.8-.3-.4-.5-.8-.6-1.2.5 0 1-.5 1-1s-.5-.8-1-1V8c0-2.5-2-4.5-4.5-4.5z"/></svg>,
  Discord: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#5865F2"/><path fill="#fff" d="M19.27 5.33a17.6 17.6 0 0 0-4.34-1.34.07.07 0 0 0-.07.03c-.19.33-.4.76-.54 1.1a16.3 16.3 0 0 0-4.88 0 11.1 11.1 0 0 0-.55-1.1.07.07 0 0 0-.07-.03 17.56 17.56 0 0 0-4.34 1.34.07.07 0 0 0-.03.03C2.75 9.6 2.1 13.78 2.4 17.9c.02.05.05.09.09.1a17.72 17.72 0 0 0 5.33 2.69.07.07 0 0 0 .08-.03c.41-.56.78-1.15 1.09-1.77a.07.07 0 0 0-.04-.1 11.65 11.65 0 0 1-1.67-.79.07.07 0 0 1-.01-.12l.33-.26a.07.07 0 0 1 .07-.01c3.5 1.6 7.3 1.6 10.76 0a.07.07 0 0 1 .08 0l.33.26a.07.07 0 0 1-.01.12c-.54.31-1.1.57-1.67.79a.07.07 0 0 0-.04.1c.32.62.69 1.21 1.09 1.77a.07.07 0 0 0 .08.03 17.68 17.68 0 0 0 5.34-2.69.07.07 0 0 0 .09-.1c.35-4.65-.59-8.8-2.5-13.54a.06.06 0 0 0-.03-.03zM8.52 15.4c-1.05 0-1.92-.96-1.92-2.14s.85-2.14 1.92-2.14c1.08 0 1.93.97 1.92 2.14 0 1.18-.85 2.14-1.92 2.14zm7.07 0c-1.05 0-1.92-.96-1.92-2.14s.85-2.14 1.92-2.14c1.08 0 1.93.97 1.92 2.14 0 1.18-.84 2.14-1.92 2.14z"/></svg>,
  LinkedIn: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#0A66C2"/><path fill="#fff" d="M8.5 10H6v8h2.5v-8zm-1.25-1A1.25 1.25 0 1 0 7.25 6a1.25 1.25 0 0 0 0 2.5zM18 14c0-2.3-.7-4-2.75-4A2.7 2.7 0 0 0 13 11.1V10h-2.5v8H13v-4.5c0-1.2.2-2 1.5-2 1.25 0 1 1.05 1 2V18H18v-4z"/></svg>,
  Viber: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#7360F2"/><path fill="#fff" d="M18.5 7.5C17.5 5.5 15.2 4.5 12 4.5 8.6 4.5 6.2 5.7 5.3 8c-.5 1.3-.6 2.8-.3 4.1.5 2 2 3.5 4 4.2V18a.5.5 0 0 0 .8.4l2.2-1.7c.3 0 .6 0 .8-.1 3.3-.2 5.7-1.8 6.2-5 .3-1.5.2-2.9-.5-4.1zm-6 5.7a.7.7 0 0 1-.7-.7.7.7 0 0 1 .7-.7.7.7 0 0 1 .7.7.7.7 0 0 1-.7.7zm2-2a.7.7 0 0 1-.7-.7.7.7 0 0 1 .7-.7.7.7 0 0 1 .7.7.7.7 0 0 1-.7.7zm-4 0a.7.7 0 0 1-.7-.7.7.7 0 0 1 .7-.7.7.7 0 0 1 .7.7.7.7 0 0 1-.7.7z"/></svg>,
  Netflix: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#E50914"/><path fill="#fff" d="M7 4h3v16L7 19V4zm7 0h3v16l-3 1V12l-3-8h3v8l3-8z"/></svg>,
  Amazon: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#FF9900"/><path fill="#fff" d="M14.5 14c-.5.3-1.1.5-1.7.5-2 0-3.5-1.5-3.5-3.5S10.8 7.5 12.8 7.5c.6 0 1.2.2 1.7.5v-1a4.5 4.5 0 1 0 0 8v-1zm.5 1.5c-2.3 1-4.8 1.2-7 .5a.3.3 0 0 0-.2.5c2.5 1 5.2.9 7.4-.2.3-.2.1-.5-.2-.8z"/></svg>,
  Microsoft: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#fff"/><rect x="4" y="4" width="7" height="7" fill="#F25022"/><rect x="13" y="4" width="7" height="7" fill="#7FBA00"/><rect x="4" y="13" width="7" height="7" fill="#00A4EF"/><rect x="13" y="13" width="7" height="7" fill="#FFB900"/></svg>,
  Uber: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#000"/><path fill="#fff" d="M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6zm0 9.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>,
  Airbnb: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#FF5A5F"/><path fill="#fff" d="M12 4.5C10 4.5 8 6.5 8 9.5c0 1.5.5 2.8 1.3 3.8L12 17l2.7-3.7c.8-1 1.3-2.3 1.3-3.8 0-3-2-5-4-5zm0 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>,
  PayPal: <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#003087"/><path fill="#009CDE" d="M15 6.5c0 2.5-1.7 4-4.5 4H9l-.8 4.5H6l2-11h4.5C14 4 15 5 15 6.5z"/><path fill="#fff" d="M13 8c0 1.5-1 2.5-2.8 2.5H9l-.6 3.5H6.5l1.7-9H12c1.6 0 2.5.8 2.5 2.2 0 .3 0 .5-.05.7H13V8z"/></svg>,
}

const SERVICES_ROW1 = ['Telegram','WhatsApp','Facebook','Instagram','TikTok','Twitter','Messenger','Apple','Google','YouTube']
const SERVICES_ROW2 = ['Snapchat','Discord','LinkedIn','Viber','Netflix','Amazon','Microsoft','Uber','Airbnb','PayPal']

// ─── Marquee Row ──────────────────────────────────────────────────────────────
function MarqueeRow({ items, reverse = false, dark }: { items: string[]; reverse?: boolean; dark: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', position: 'relative', width: '100%', paddingBottom: 4 }}>
      {/* fade edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, zIndex: 2,
        background: dark
          ? 'linear-gradient(to right, #0a0f1e, transparent)'
          : 'linear-gradient(to right, #f0f4ff, transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, zIndex: 2,
        background: dark
          ? 'linear-gradient(to left, #0a0f1e, transparent)'
          : 'linear-gradient(to left, #f0f4ff, transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex', gap: 12,
        animation: `marquee${reverse ? 'Rev' : ''} 30s linear infinite`,
        width: 'max-content',
      }}>
        {doubled.map((name, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 16px', borderRadius: 12,
            background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
            flexShrink: 0,
            boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {SERVICE_SVGS[name]}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#e2e8f0' : '#1e293b', whiteSpace: 'nowrap' }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, dark }: { q: string; a: string; dark: boolean }) {
  const [open, setOpen] = useState(false)
  const accent = '#6366f1'
  return (
    <div onClick={() => setOpen(v => !v)} style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
      border: `1px solid ${open ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
      borderRadius: 14, padding: '18px 22px', cursor: 'pointer',
      transition: 'all 0.2s', marginBottom: 10,
      boxShadow: open ? `0 0 20px ${dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'}` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f1f5f9' : '#1e293b' }}>{q}</span>
        <ChevronDown size={18} style={{
          color: open ? accent : (dark ? '#94a3b8' : '#64748b'),
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', flexShrink: 0,
        }} />
      </div>
      {open && <p style={{ fontSize: 14, color: dark ? '#94a3b8' : '#64748b', margin: '12px 0 0', lineHeight: 1.7 }}>{a}</p>}
    </div>
  )
}

// ─── Cookie Consent Banner ───────────────────────────────────────────────────
function CookieConsent({ dark, accent, border, textSec, textPrimary }: {
  dark: boolean; accent: string; border: string; textSec: string; textPrimary: string
}) {
  // Cookie consent — DB-backed via /profile/public-prefs (no localStorage)
  const [visible, setVisible] = useState(true)
  const [animate, setAnimate] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (visible) setTimeout(() => setAnimate(true), 800)
    // Fetch existing consent status from DB so returning visitors don't see banner again
    import('../lib/api').then(({ api }) => {
      api.get('/profile/public-prefs').then((res: any) => {
        if (res?.preferences?.cookieConsent === true) {
          setVisible(false)
        }
        setLoaded(true)
      }).catch(() => setLoaded(true))
    }).catch(() => setLoaded(true))
  }, [])

  const persistCookieConsent = (accepted: boolean) => {
    import('../lib/api').then(({ api }) => {
      api.put('/profile/public-prefs', { cookieConsent: accepted }).catch(() => {})
    }).catch(() => {})
  }

  const accept = () => {
    persistCookieConsent(true)
    setAnimate(false)
    setTimeout(() => setVisible(false), 350)
  }

  const decline = () => {
    persistCookieConsent(false)
    setAnimate(false)
    setTimeout(() => setVisible(false), 350)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: `translateX(-50%) translateY(${animate ? '0' : '120px'})`,
      zIndex: 9999, width: '92%', maxWidth: 860,
      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      pointerEvents: animate ? 'all' : 'none',
    }}>
      <div style={{
        background: dark ? 'rgba(15,22,35,0.97)' : 'rgba(255,255,255,0.98)',
        border: `1px solid ${dark ? 'rgba(99,102,241,0.3)' : '#e2e8f0'}`,
        borderRadius: 18,
        boxShadow: dark
          ? '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)'
          : '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.08)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Cookie icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          🍪
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>
            We use cookies to improve your experience
          </p>
          <p style={{ fontSize: 12, color: textSec, margin: 0, lineHeight: 1.6 }}>
            We use cookies and similar technologies to enhance functionality, analyze traffic, and personalize content.
            By clicking "Accept All", you agree to our{' '}
            <a href="/privacy" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            onClick={decline}
            style={{
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1px solid ${border}`,
              background: 'transparent',
              color: textSec,
              cursor: 'pointer', transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = textSec }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            style={{
              padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none',
              background: `linear-gradient(135deg, #4f46e5, #7c3aed)`,
              color: '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.4)' }}
          >
            Accept All 🎉
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dark = theme === 'dark'

  // ── Settings: loaded from DB API only ──
  const [lpSettings, setLpSettings] = useState<{
    stats: { label: string; value: number; suffix: string }[]
    hero: { headline: string; subtext: string }
    badge: string
    ctaPrimary: string
    servicesVisible: boolean
    testimonialsVisible: boolean
  } | null>(null)

  useEffect(() => {
    // Load landing settings from DB API
    const BASE = (window as any).__VITE_API_URL__ ||
      (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : null) ||
      'http://localhost:5000/api'
    fetch(`${BASE}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.landingPage) setLpSettings(data.landingPage)
      })
      .catch(() => {})
    // Clean up old localStorage keys from previous version
    try {
      localStorage.removeItem('bittx_landing_settings')
      localStorage.removeItem('landing_theme')
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [theme, dark])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Tokens
  const bg         = dark ? '#0a0f1e' : '#f0f4ff'
  const cardBg     = dark ? 'rgba(255,255,255,0.05)' : '#fff'
  const border      = dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
  const textPrimary = dark ? '#f1f5f9' : '#0f172a'
  const textSec     = dark ? '#94a3b8' : '#475569'
  const accent      = '#6366f1'
  const accentGlow  = dark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)'
  const navBg       = scrolled ? (dark ? 'rgba(10,15,30,0.92)' : 'rgba(240,244,255,0.92)') : 'transparent'

  const FEATURES = [
    { icon: <Smartphone size={22} color={accent} />, title: 'Live OTP Inbox', desc: 'Receive SMS verification codes in real-time. Track incoming OTPs the moment providers deliver them.' },
    { icon: <Globe size={22} color='#22d3ee' />, title: 'Global Numbers', desc: 'Choose services, countries, and networks from one unified panel with massive inventory.' },
    { icon: <Code2 size={22} color='#a78bfa' />, title: 'Developer API', desc: 'RESTful endpoints with bearer-token auth. Full docs and ready-to-use code examples included.' },
    { icon: <Shield size={22} color='#34d399' />, title: 'Secure Access', desc: 'Role-based access control with 2-step verification. Your account and data stay protected.' },
    { icon: <Activity size={22} color='#fb923c' />, title: 'Real-Time Console', desc: 'Live OTP console shows which rental is waiting, used, or ready — no guessing needed.' },
    { icon: <BarChart3 size={22} color='#f472b6' />, title: 'Analytics & Reports', desc: 'Track OTP sessions, usage patterns, and agent performance from a single dashboard.' },
  ]

  /* Default testimonials — shown when admin hasn't added custom ones yet */
  const DEFAULT_TESTIMONIALS: { name: string; role: string; rating: number; text: string }[] = [
    { name: 'Alex M.', role: 'Data Analyst', rating: 5, text: 'The country filters help my team source inventory without juggling spreadsheets.' },
    { name: 'Oliver', role: 'Automation Builder', rating: 5, text: 'The dashboard is fast enough for repeated OTP checks, and the API docs match the actual request flow.' },
    { name: 'Emma', role: 'Growth Operator', rating: 5, text: 'We moved our verification testing into BITTX SMS and stopped juggling random providers for every region.' },
    { name: 'Rafiq H.', role: 'Backend Developer', rating: 5, text: 'Real-time socket delivery is surprisingly smooth. Integrated with our pipeline in less than a day.' },
    { name: 'Sara K.', role: 'QA Engineer', rating: 5, text: 'Bulk number generation and CSV export saved us hours of manual work every week.' },
    { name: 'James T.', role: 'Product Manager', rating: 5, text: 'The agent panel makes it easy to manage users and track commission without any extra tools.' },
  ]
  const lpTestimonials: { name: string; role: string; rating: number; text: string }[] = (typeof window !== 'undefined'
    ? (window as any).__LPCACHED_TESTIMONIALS__
    : null) || []
  /* Use admin-added testimonials if available, fallback to defaults */
  const testimonials = lpTestimonials.length > 0 ? lpTestimonials : DEFAULT_TESTIMONIALS
  const TESTIMONIALS_ROW1 = testimonials.slice(0, Math.ceil(testimonials.length / 2))
  const TESTIMONIALS_ROW2 = testimonials.slice(Math.ceil(testimonials.length / 2))

  const FAQS = [
    { q: 'How do I get started?', a: 'Create an account using your agent\'s referral email. After registration and profile completion, you can immediately access the dashboard to rent numbers and receive OTPs.' },
    { q: 'What countries are supported?', a: 'We support virtual numbers across dozens of countries including Bangladesh, India, USA, UK, Russia, and many more. The available list updates regularly.' },
    { q: 'How are OTPs delivered?', a: 'OTPs are delivered in real-time via our live console. As soon as a provider delivers the SMS, it appears in your inbox with the sender ID and timestamp.' },
    { q: 'Can I use the API from my own tools?', a: 'Yes. BITTX SMS provides a REST API with bearer-token authentication. You can rent numbers, poll SMS, and manage sessions from your own applications.' },
    { q: 'Is there a free plan?', a: 'Yes, there is a free access period during launch. Paid plans with higher limits and additional features are being prepared.' },
    { q: 'How does the agent system work?', a: 'Every user registers under an agent. Agents manage their user base, earn commissions, and handle support. Contact an agent to get your referral email for registration.' },
  ]

  return (
    <div style={{ background: bg, color: textPrimary, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navBg, backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${border}` : 'none',
        transition: 'all 0.3s ease', padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: scrolled ? 54 : 66, transition: 'height 0.3s ease' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BittxLogo size={38} />
            <span style={{ fontSize: 18, fontWeight: 900, color: textPrimary, letterSpacing: '-0.5px' }}>
              BITTX <span style={{ color: accent }}>SMS</span>
            </span>
          </div>
          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="lp-hide-mobile">
            {['Features','Services','Pricing','FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                style={{ fontSize: 14, fontWeight: 600, color: textSec, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = accent)}
                onMouseLeave={e => (e.currentTarget.style.color = textSec)}>{item}</a>
            ))}
          </div>
          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${border}`, background: cardBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: textSec }}
              title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link to="/login" className="lp-hide-mobile" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: textPrimary, textDecoration: 'none', border: `1px solid ${border}`, background: 'transparent' }}>
              Sign In
            </Link>
            <Link to="/register" className="lp-hide-mobile" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
              Get Started
            </Link>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="lp-show-mobile"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textPrimary, padding: 4 }}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ background: dark ? '#111827' : '#fff', border: `1px solid ${border}`, borderRadius: 16, margin: '0 12px 12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Features','Services','Pricing','FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 15, fontWeight: 600, color: textSec, textDecoration: 'none', padding: '10px 12px', borderRadius: 8 }}>{item}</a>
            ))}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, marginTop: 4, display: 'flex', gap: 8 }}>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: textPrimary, textDecoration: 'none', border: `1px solid ${border}` }}>Sign In</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>Register</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section (2-column: text left, dashboard right) ── */}
      <section style={{ paddingTop: 100, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        {/* Aurora glows */}
        {dark && <>
          <div style={{ position: 'absolute', top: -150, left: '-5%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -80, right: '5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 220, left: '50%', transform: 'translateX(-50%)', width: 900, height: 2, background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.35), transparent)', pointerEvents: 'none' }} />
        </>}
        {!dark && <div style={{ position: 'absolute', top: -60, left: '0', width: 600, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />}

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', position: 'relative' }}>
          {/* 2-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="lp-hero-grid">

            {/* ── Left: Text ── */}
            <div>
              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, border: `1px solid ${dark ? 'rgba(99,102,241,0.4)' : '#c7d2fe'}`, background: dark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)', fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 28, letterSpacing: '0.05em' }}>
                <Wifi size={12} /> {lpSettings?.badge || 'REAL-TIME OTP PLATFORM'}
              </div>

              {/* Headline */}
              <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 58px)', fontWeight: 900, lineHeight: 1.1, color: textPrimary, margin: '0 0 22px', letterSpacing: '-2px' }}>
                {lpSettings?.hero?.headline
                  ? <>{lpSettings.hero.headline}</>
                  : <>Virtual Numbers for{' '}
                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      Instant OTP
                    </span>
                    <br />Verification</>
                }
              </h1>

              {/* Sub */}
              <p style={{ fontSize: 16, color: textSec, lineHeight: 1.8, maxWidth: 460, margin: '0 0 36px' }}>
                {lpSettings?.hero?.subtext || 'Rent temporary phone numbers, monitor SMS codes in real-time, and automate OTP workflows — all from one powerful panel.'}
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 12, fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: dark ? '0 4px 24px rgba(99,102,241,0.5)' : '0 4px 18px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = dark ? '0 4px 24px rgba(99,102,241,0.5)' : '0 4px 18px rgba(99,102,241,0.35)' }}>
                  {lpSettings?.ctaPrimary || 'Start Free Now'} <ArrowRight size={15} />
                </Link>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', borderRadius: 12, fontSize: 15, fontWeight: 800, color: textPrimary, textDecoration: 'none', border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}>
                  Sign In <ChevronRight size={14} />
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[{ icon: <Shield size={13} />, l: 'Secure & Encrypted' }, { icon: <Zap size={13} />, l: 'Real-Time Delivery' }, { icon: <Lock size={13} />, l: 'Privacy Protected' }].map(({ icon, l }) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textSec, fontWeight: 600 }}>
                    <span style={{ color: accent }}>{icon}</span>{l}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: BITTX Dashboard Screenshot Mockup ── */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dark && (
                <div style={{ position: 'absolute', inset: '-40px', borderRadius: 32, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.20) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
              )}
              <div style={{
                position: 'relative', zIndex: 1,
                width: 540, height: 420,
                borderRadius: 16,
                border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                overflow: 'hidden',
                boxShadow: dark
                  ? '0 0 0 1px rgba(99,102,241,0.2), 0 32px 80px rgba(0,0,0,0.7)'
                  : '0 0 0 1px rgba(99,102,241,0.08), 0 24px 64px rgba(0,0,0,0.12)',
                transform: 'perspective(1200px) rotateY(-4deg) rotateX(2deg)',
                transition: 'transform 0.4s ease',
                background: '#f0f4f8',
                display: 'flex',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'perspective(1200px) rotateY(-4deg) rotateX(2deg)')}
              >
                {/* ── Sidebar ── */}
                <div style={{ width: 130, background: '#fff', borderRight: '1px solid #e8ecf0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {/* Logo */}
                  <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={12} color="#fff"/>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>BITTX SMS.</span>
                  </div>
                  {/* Dashboard item */}
                  <div style={{ padding: '8px 10px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 7, background: 'transparent' }}>
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#94a3b8' }}/>
                      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>Dashboard</span>
                    </div>
                  </div>
                  {/* DIALER PANEL label */}
                  <div style={{ padding: '4px 10px 2px' }}>
                    <span style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>Dialer Panel</span>
                  </div>
                  {/* Nav items */}
                  {[
                    { label: 'Get Number', active: true, icon: '#' },
                    { label: 'Console', active: false, icon: '>' },
                    { label: 'Summary', active: false, icon: '≡' },
                    { label: 'Access List', active: false, icon: '≡' },
                    { label: 'Sender / Range', active: false, icon: '◎' },
                    { label: 'News Feed', active: false, icon: '◈' },
                    { label: 'API Key Access', active: false, icon: '∞' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '2px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 7,
                        background: item.active ? '#7c3aed' : 'transparent' }}>
                        <span style={{ fontSize: 9, color: item.active ? '#fff' : '#64748b', fontWeight: item.active ? 700 : 500 }}>{item.label}</span>
                      </div>
                    </div>
                  ))}
                  {/* Bottom Tweaks */}
                  <div style={{ marginTop: 'auto', padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>⚙ Tweaks</div>
                    <div style={{ background: '#f8fafc', borderRadius: 7, padding: '5px 7px' }}>
                      <div style={{ fontSize: 8, fontWeight: 800, color: '#475569', marginBottom: 2 }}>Developer?</div>
                      <div style={{ fontSize: 7, color: '#94a3b8', marginBottom: 4 }}>See the API documentation</div>
                      <div style={{ background: '#7c3aed', borderRadius: 5, padding: '2px 8px', fontSize: 7, fontWeight: 700, color: '#fff', textAlign: 'center', width: 'fit-content' }}>View</div>
                    </div>
                  </div>
                </div>

                {/* ── Main Content ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Topbar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#fff', borderBottom: '1px solid #e8ecf0', flexShrink: 0 }}>
                    <div style={{ background: '#f1f5f9', borderRadius: 7, padding: '3px 10px', fontSize: 8, color: '#94a3b8' }}>Search</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 8, color: '#64748b', fontFamily: 'monospace' }}>23:01:12 UTC+0</span>
                      <div style={{ background: '#dcfce7', borderRadius: 10, padding: '2px 8px', fontSize: 8, fontWeight: 700, color: '#15803d' }}>$0.00</div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>M</div>
                    </div>
                  </div>

                  {/* Page content */}
                  <div style={{ flex: 1, padding: '10px 12px', overflow: 'hidden', display: 'flex', gap: 10 }}>
                    {/* Left panel */}
                    <div style={{ width: 120, flexShrink: 0, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', fontSize: 8, color: '#94a3b8' }}>🔍 Search numbers...</div>
                      {/* Filter buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        <div style={{ background: '#7c3aed', borderRadius: 6, padding: '3px 0', fontSize: 8, fontWeight: 700, color: '#fff', textAlign: 'center' }}>All</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 6, padding: '3px 0', border: '1px solid #e2e8f0', fontSize: 8, color: '#64748b' }}>✓ Success</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 6, padding: '3px 0', border: '1px solid #e2e8f0', fontSize: 8, color: '#64748b' }}>✕ Failed</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 6, padding: '3px 0', border: '1px solid #e2e8f0', fontSize: 8, color: '#64748b' }}>⏳ Pending</div>
                      </div>
                      {/* Success rate */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 7, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Success Rate</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b' }}>0.0%</span>
                      </div>
                      {/* Stats */}
                      {[{ dot: '#22c55e', label: 'Success', val: '0' }, { dot: '#ef4444', label: 'Failed', val: '0' }, { dot: '#f59e0b', label: 'Pending', val: '0' }].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${s.dot}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }}/>
                            </div>
                            <span style={{ fontSize: 8, color: '#64748b' }}>{s.label}</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#1e293b' }}>{s.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Right panel */}
                    <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                      {/* Header */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid #7c3aed' }}/>
                          Get Number
                        </div>
                        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Allocate numbers from a prefix range and watch incoming OTPs.</div>
                      </div>
                      {/* Tabs + Range input */}
                      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 7, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Enter Number Range</div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          {['RANGE', 'SEARCH', 'ACCESS'].map((t, i) => (
                            <div key={t} style={{ padding: '3px 8px', borderRadius: 12, fontSize: 7, fontWeight: 700, background: i === 0 ? '#7c3aed' : 'transparent', color: i === 0 ? '#fff' : '#94a3b8', border: i !== 0 ? '1px solid #e2e8f0' : 'none' }}>{t}</div>
                          ))}
                          <div style={{ marginLeft: 'auto', fontSize: 7, color: '#94a3b8', fontWeight: 600 }}>ADVANCE MODE</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 7, padding: '5px 10px', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8' }}>#</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>2298195XXX</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 5, height: 5, background: '#fff', borderRadius: 1 }}/>
                              </div>
                              <span style={{ fontSize: 8, color: '#475569' }}>National Format</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, border: '1px solid #cbd5e1' }}/>
                              <span style={{ fontSize: 8, color: '#475569' }}>Remove (+)</span>
                            </div>
                          </div>
                          <div style={{ background: '#7c3aed', borderRadius: 12, padding: '4px 12px', fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ↻ Get Number
                          </div>
                        </div>
                      </div>
                      {/* Table header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                        <span style={{ fontSize: 8, color: '#94a3b8' }}>0 of 0</span>
                        <span style={{ fontSize: 8, color: '#94a3b8' }}>↻ Refresh</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px', padding: '4px 6px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        {['NUMBER INFO', 'COUNTRY / OPERATOR', 'TIME'].map(h => (
                          <span key={h} style={{ fontSize: 7, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                        ))}
                      </div>
                      {/* Empty state */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ fontSize: 20, color: '#e2e8f0' }}>#</div>
                        <span style={{ fontSize: 9, color: '#94a3b8' }}>No numbers found</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ── Community / Social Section ── */}
      <section style={{
        padding: '72px 24px',
        background: dark
          ? 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(124,58,237,0.08) 50%, rgba(236,72,153,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(79,70,229,0.07) 0%, rgba(124,58,237,0.05) 50%, rgba(236,72,153,0.04) 100%)',
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        {dark && (
          <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        )}
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="lp-hero-grid">

          {/* Left: Text */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100, border: `1px solid ${dark ? 'rgba(99,102,241,0.4)' : '#c7d2fe'}`, background: dark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', fontSize: 11, fontWeight: 800, color: '#818cf8', marginBottom: 20, letterSpacing: '0.06em' }}>
              📢 STAY CONNECTED
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, color: textPrimary, margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.2 }}>
              Join our community &<br />
              <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                stay updated
              </span>
            </h2>
            <p style={{ fontSize: 15, color: textSec, lineHeight: 1.8, margin: '0 0 8px' }}>
              Follow us to get all updates, new features, tips and exclusive offers before anyone else.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {[
                { icon: '✅', text: 'Latest OTP method updates' },
                { icon: '✅', text: 'New service announcements' },
                { icon: '✅', text: 'Exclusive tips & tricks' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textSec, fontWeight: 500, width: '100%' }}>
                  <span style={{ fontSize: 14 }}>{icon}</span> {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Social cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* YouTube */}
            <a href="https://youtube.com/@bittxsms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: dark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${dark ? 'rgba(255,0,0,0.25)' : '#fecaca'}`,
                borderRadius: 16, padding: '20px 18px',
                transition: 'all 0.25s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,0,0,0.2)'; e.currentTarget.style.borderColor = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = dark ? 'rgba(255,0,0,0.25)' : '#fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255,0,0,0.35)', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2s-.3-1.9-1.1-2.7c-1-.7-2.2-.7-2.7-.8C16.8 2.5 12 2.5 12 2.5s-4.8 0-7.7.2c-.5 0-1.7 0-2.7.8C.8 4.3.5 6.2.5 6.2S.2 8.4.2 10.6v2.1c0 2.2.3 4.4.3 4.4s.3 1.9 1.1 2.7c1 .7 2.4.7 3 .8C6.8 20.7 12 20.7 12 20.7s4.8 0 7.7-.2c.5 0 1.7 0 2.7-.8.8-.8 1.1-2.7 1.1-2.7s.3-2.2.3-4.4v-2.1c0-2.2-.3-4.4-.3-4.4zM9.7 15.5V8.7l6.6 3.4-6.6 3.4z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>YouTube</div>
                    <div style={{ fontSize: 12, color: textSec }}>@bittxsms</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: textSec, margin: 0, lineHeight: 1.6 }}>Tutorial videos, OTP guides & platform walkthroughs.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  Subscribe → <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </a>

            {/* Telegram */}
            <a href="https://t.me/bittxsms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: dark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${dark ? 'rgba(34,158,217,0.25)' : '#bae6fd'}`,
                borderRadius: 16, padding: '20px 18px',
                transition: 'all 0.25s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(34,158,217,0.2)'; e.currentTarget.style.borderColor = '#229ED9' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = dark ? 'rgba(34,158,217,0.25)' : '#bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#229ED9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(34,158,217,0.35)', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 8.2l-2 9.4c-.1.6-.6.8-1 .5l-2.8-2-1.3 1.3c-.1.1-.3.2-.6.2l.2-2.8 5-4.5c.2-.2 0-.3-.3-.1L6.1 14.6l-2.7-.8c-.6-.2-.6-.6.1-.9l10.5-4c.5-.2 1 .1.9.7l-.1.6z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>Telegram</div>
                    <div style={{ fontSize: 12, color: textSec }}>@bittxsms</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: textSec, margin: 0, lineHeight: 1.6 }}>Instant updates, new methods & community support.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#229ED9' }}>
                  Join Channel → <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </a>

            {/* Facebook */}
            <a href="https://facebook.com/bittxsms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: dark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${dark ? 'rgba(24,119,242,0.25)' : '#bfdbfe'}`,
                borderRadius: 16, padding: '20px 18px',
                transition: 'all 0.25s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(24,119,242,0.2)'; e.currentTarget.style.borderColor = '#1877F2' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = dark ? 'rgba(24,119,242,0.25)' : '#bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(24,119,242,0.35)', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>Facebook</div>
                    <div style={{ fontSize: 12, color: textSec }}>BITTX SMS</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: textSec, margin: 0, lineHeight: 1.6 }}>Community posts, announcements & user discussions.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1877F2' }}>
                  Follow Page → <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </a>

            {/* Instagram */}
            <a href="https://instagram.com/bittxsms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: dark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${dark ? 'rgba(225,48,108,0.25)' : '#fbcfe8'}`,
                borderRadius: 16, padding: '20px 18px',
                transition: 'all 0.25s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(225,48,108,0.2)'; e.currentTarget.style.borderColor = '#E1306C' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = dark ? 'rgba(225,48,108,0.25)' : '#fbcfe8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(225,48,108,0.35)', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>Instagram</div>
                    <div style={{ fontSize: 12, color: textSec }}>@bittxsms</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: textSec, margin: 0, lineHeight: 1.6 }}>Visual updates, feature highlights & behind the scenes.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#E1306C' }}>
                  Follow → <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Services Marquee ── */}
      {(lpSettings === null || lpSettings.servicesVisible !== false) && (
      <section id="services" style={{ padding: '70px 0', position: 'relative', overflow: 'hidden', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: dark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.03)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36, padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100, border: `1px solid ${dark ? 'rgba(34,211,153,0.3)' : '#bbf7d0'}`, background: dark ? 'rgba(34,211,153,0.08)' : 'rgba(34,211,153,0.07)', fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 14, letterSpacing: '0.06em' }}>
            <Smartphone size={11} /> SUPPORTED SERVICES
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, color: textPrimary, margin: '0 0 10px', letterSpacing: '-1px' }}>
            Verify on any platform
          </h2>
          <p style={{ fontSize: 15, color: textSec, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
            Rent numbers and receive OTPs for all major apps and services worldwide.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MarqueeRow items={SERVICES_ROW1} reverse={false} dark={dark} />
          <MarqueeRow items={SERVICES_ROW2} reverse={true} dark={dark} />
        </div>
      </section>
      )}

      {/* ── Stats ── */}
      <section style={{ padding: '72px 24px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.02)', borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, textAlign: 'center' }}>
          {(lpSettings?.stats || [
            { value: 25000, suffix: '+',  label: 'OTP Sessions'   },
            { value: 250,   suffix: 'K+', label: 'Numbers Routed' },
            { value: 98,    suffix: '%',  label: 'Uptime'         },
            { value: 4000,  suffix: '+',  label: 'Active Users'   },
          ]).map(({ value, suffix, label }, idx) => {
            const icons = [
              <Activity size={22} color={accent} />,
              <Smartphone size={22} color='#22d3ee' />,
              <Wifi size={22} color='#34d399' />,
              <Users size={22} color='#fb923c' />,
            ]
            return (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{icons[idx % 4]}</div>
                <div style={{ fontSize: 42, fontWeight: 900, color: textPrimary, letterSpacing: '-1.5px', lineHeight: 1 }}>
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: 13, color: textSec, fontWeight: 600, marginTop: 6 }}>{label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100, border: `1px solid ${dark ? 'rgba(99,102,241,0.4)' : '#c7d2fe'}`, background: dark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', fontSize: 11, fontWeight: 800, color: '#818cf8', marginBottom: 20, letterSpacing: '0.06em' }}>
              <Cpu size={11} /> PLATFORM FEATURES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: textPrimary, margin: '0 0 16px', letterSpacing: '-1.5px' }}>
              Everything in one clean panel
            </h2>
            <p style={{ fontSize: 16, color: textSec, maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}>
              Rent numbers, monitor SMS, and run OTP workflows with a single unified dashboard.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${border}`, borderRadius: 18, padding: '28px 26px', transition: 'all 0.25s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${accentGlow}`; e.currentTarget.style.borderColor = dark ? 'rgba(99,102,241,0.5)' : '#c7d2fe' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 14, color: textSec, lineHeight: 1.7, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: '100px 24px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.02)', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: textPrimary, margin: '0 0 14px', letterSpacing: '-1px' }}>
              Get started in 3 steps
            </h2>
            <p style={{ fontSize: 15, color: textSec, lineHeight: 1.7 }}>Simple setup, instant access to virtual numbers worldwide.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              { step: '01', icon: <UserPlus size={24} />, title: 'Create Account', desc: 'Register with your agent\'s email. Complete your profile to unlock full access.' },
              { step: '02', icon: <Smartphone size={24} />, title: 'Rent a Number', desc: 'Pick a service, select a country, and rent a temporary number instantly.' },
              { step: '03', icon: <MessageSquare size={24} />, title: 'Receive OTP', desc: 'Watch your live inbox. OTP codes arrive in real-time, ready to use.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 8px 28px rgba(99,102,241,0.45)`, margin: '0 auto' }}>
                    {icon}
                  </div>
                  <div style={{ position: 'absolute', top: -6, right: -10, width: 24, height: 24, borderRadius: 8, background: dark ? '#0a0f1e' : '#f0f4ff', border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: accent }}>
                    {step}
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: '0 0 10px' }}>{title}</h3>
                <p style={{ fontSize: 14, color: textSec, lineHeight: 1.7, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials (only show when admin has added real ones) ── */}
      {testimonials.length > 0 && (lpSettings === null || lpSettings.testimonialsVisible !== false) && (
      <section style={{ padding: '100px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 56, padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100, border: `1px solid ${dark ? 'rgba(251,146,60,0.3)' : '#fed7aa'}`, background: dark ? 'rgba(251,146,60,0.08)' : 'rgba(251,146,60,0.07)', fontSize: 11, fontWeight: 800, color: '#fb923c', marginBottom: 20, letterSpacing: '0.06em' }}>
            <Star size={11} /> USER REVIEWS
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: textPrimary, margin: '0 0 14px', letterSpacing: '-1px' }}>
            Trusted by verification teams
          </h2>
          <p style={{ fontSize: 15, color: textSec, lineHeight: 1.7 }}>Built for teams that need repeatable OTP workflows at scale.</p>
        </div>

        {/* Row 1 — scrolls left */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: dark ? 'linear-gradient(to right, #0a0f1e, transparent)' : 'linear-gradient(to right, #f0f4ff, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: dark ? 'linear-gradient(to left, #0a0f1e, transparent)' : 'linear-gradient(to left, #f0f4ff, transparent)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 16, animation: 'marquee 40s linear infinite', width: 'max-content', padding: '4px 0' }}>
            {[...TESTIMONIALS_ROW1, ...TESTIMONIALS_ROW1].map(({ name, role, rating, text }, i) => (
              <div key={i} style={{ width: 280, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 16, padding: '20px 20px' }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} style={{ fill: j < rating ? '#fbbf24' : (dark ? '#1e293b' : '#e2e8f0'), color: j < rating ? '#fbbf24' : (dark ? '#1e293b' : '#e2e8f0') }} />)}
                </div>
                <p style={{ fontSize: 13, color: textSec, lineHeight: 1.65, margin: '0 0 16px', fontStyle: 'italic' }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, #4f46e5, #7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>{name}</div>
                    <div style={{ fontSize: 11, color: textSec }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: dark ? 'linear-gradient(to right, #0a0f1e, transparent)' : 'linear-gradient(to right, #f0f4ff, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: dark ? 'linear-gradient(to left, #0a0f1e, transparent)' : 'linear-gradient(to left, #f0f4ff, transparent)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 16, animation: 'marqueeRev 40s linear infinite', width: 'max-content', padding: '4px 0' }}>
            {[...TESTIMONIALS_ROW2, ...TESTIMONIALS_ROW2].map(({ name, role, rating, text }, i) => (
              <div key={i} style={{ width: 280, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 16, padding: '20px 20px' }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} style={{ fill: j < rating ? '#fbbf24' : (dark ? '#1e293b' : '#e2e8f0'), color: j < rating ? '#fbbf24' : (dark ? '#1e293b' : '#e2e8f0') }} />)}
                </div>
                <p style={{ fontSize: 13, color: textSec, lineHeight: 1.65, margin: '0 0 16px', fontStyle: 'italic' }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, #7c3aed, #ec4899)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>{name}</div>
                    <div style={{ fontSize: 11, color: textSec }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '100px 24px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.02)', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: textPrimary, margin: '0 0 14px', letterSpacing: '-1px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 15, color: textSec, lineHeight: 1.7 }}>Free access while paid plans are being prepared.</p>
          </div>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `2px solid ${accent}`, borderRadius: 24, padding: '40px 36px', textAlign: 'center', boxShadow: `0 0 60px ${accentGlow}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 18, right: 18, padding: '4px 12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 100, fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
                LAUNCH OFFER
              </div>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🚀</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: '0 0 8px' }}>Free Access</h3>
              <p style={{ fontSize: 14, color: textSec, margin: '0 0 22px' }}>Full access during launch period</p>
              <div style={{ fontSize: 56, fontWeight: 900, color: textPrimary, letterSpacing: '-2px', lineHeight: 1 }}>
                $0<span style={{ fontSize: 16, fontWeight: 600, color: textSec }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: textSec, margin: '8px 0 28px' }}>Paid plans coming soon</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
                {['Temporary number rentals','Live OTP polling & console','Developer REST API access','API key management','Console history & analytics','Agent-based account system'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color={accent} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: textSec, fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                <Zap size={16} /> Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: textPrimary, margin: '0 0 14px', letterSpacing: '-1px' }}>Frequently asked questions</h2>
            <p style={{ fontSize: 15, color: textSec, lineHeight: 1.7 }}>Common questions about BITTX SMS workflows.</p>
          </div>
          {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} dark={dark} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden', borderTop: `1px solid ${border}`, background: dark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)' }}>
        {dark && <div style={{ position: 'absolute', bottom: -100, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />}
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: textPrimary, margin: '0 0 16px', letterSpacing: '-1.5px' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 16, color: textSec, lineHeight: 1.75, maxWidth: 480, margin: '0 auto 40px' }}>
            Join thousands of users already using BITTX SMS to power their verification workflows.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 800, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: dark ? '0 6px 28px rgba(99,102,241,0.5)' : '0 6px 22px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}>
              <Zap size={18} /> {lpSettings?.ctaPrimary ? `${lpSettings.ctaPrimary} →` : 'Create Free Account'}
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 12, fontSize: 16, fontWeight: 800, color: textPrimary, textDecoration: 'none', border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', transition: 'all 0.2s' }}>
              Sign In <ExternalLink size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[<><Lock size={12} /> Secure & Private</>, <><TrendingUp size={12} /> Real-Time Delivery</>, <><Shield size={12} /> Enterprise Ready</>].map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: textSec, fontWeight: 600 }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: dark ? '#050a15' : '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '60px 24px 32px', color: '#94a3b8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <BittxLogo size={34} />
                <span style={{ fontSize: 17, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                  BITTX <span style={{ color: accent }}>SMS</span>
                </span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 200, margin: '0 0 16px' }}>
                Live virtual phone number infrastructure for online SMS and OTP verification.
              </p>

              {/* Social Media Icons */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {/* YouTube */}
                <a href="https://youtube.com/@bittxsms" target="_blank" rel="noopener noreferrer" title="YouTube" style={{ textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(0)'}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 6px rgba(255,0,0,0.35)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2s-.3-1.9-1.1-2.7c-1-.7-2.2-.7-2.7-.8C16.8 2.5 12 2.5 12 2.5s-4.8 0-7.7.2c-.5 0-1.7 0-2.7.8C.8 4.3.5 6.2.5 6.2S.2 8.4.2 10.6v2.1c0 2.2.3 4.4.3 4.4s.3 1.9 1.1 2.7c1 .7 2.4.7 3 .8C6.8 20.7 12 20.7 12 20.7s4.8 0 7.7-.2c.5 0 1.7 0 2.7-.8.8-.8 1.1-2.7 1.1-2.7s.3-2.2.3-4.4v-2.1c0-2.2-.3-4.4-.3-4.4zM9.7 15.5V8.7l6.6 3.4-6.6 3.4z"/></svg>
                  </div>
                </a>
                {/* Telegram */}
                <a href="https://t.me/bittxsms" target="_blank" rel="noopener noreferrer" title="Telegram" style={{ textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(0)'}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#229ED9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 6px rgba(34,158,217,0.35)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 8.2l-2 9.4c-.1.6-.6.8-1 .5l-2.8-2-1.3 1.3c-.1.1-.3.2-.6.2l.2-2.8 5-4.5c.2-.2 0-.3-.3-.1L6.1 14.6l-2.7-.8c-.6-.2-.6-.6.1-.9l10.5-4c.5-.2 1 .1.9.7l-.1.6z"/></svg>
                  </div>
                </a>
                {/* Facebook */}
                <a href="https://facebook.com/bittxsms" target="_blank" rel="noopener noreferrer" title="Facebook" style={{ textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(0)'}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 6px rgba(24,119,242,0.35)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>
                  </div>
                </a>
                {/* Twitter / X */}
                <a href="https://twitter.com/bittxsms" target="_blank" rel="noopener noreferrer" title="Twitter / X" style={{ textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget.firstElementChild as HTMLElement).style.transform = 'translateY(0)'}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                </a>
              </div>

              <a href="https://t.me/bittxsmssupport" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: accent, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MessageSquare size={13} /> Telegram Support
              </a>
            </div>
            {[
              { title: 'Product', links: [{ label: 'OTP Panel', to: '/login' }, { label: 'Live Console', to: '/login' }, { label: 'Global Numbers', to: '/login' }, { label: 'Developer API', to: '/login' }] },
              { title: 'Resources', links: [{ label: 'API Reference', to: '/login' }, { label: 'Pricing', to: '#pricing' }, { label: 'FAQ', to: '#faq' }] },
              { title: 'Legal', links: [{ label: 'Terms of Service', to: '/terms' }, { label: 'Privacy Policy', to: '/privacy' }] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</h4>
                {links.map(({ label, to }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <Link to={to} style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>{label}</Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13 }}>© 2026 BITTX SMS. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link to="/login" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>Sign In</Link>
              <Link to="/register" style={{ fontSize: 13, color: accent, fontWeight: 700, textDecoration: 'none' }}>Get Started →</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Cookie Consent Banner ── */}
      <CookieConsent dark={dark} accent={accent} border={border} textSec={textSec} textPrimary={textPrimary} />

      {/* ── Global Styles ── */}
      <style>{`
        .lp-hide-mobile { display: flex !important; }
        .lp-show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .lp-hide-mobile { display: none !important; }
          .lp-show-mobile { display: flex !important; }
          .lp-hero-grid { grid-template-columns: 1fr !important; }
        }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }

        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeRev {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
