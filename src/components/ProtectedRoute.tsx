import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { settingsApi } from '../lib/api'

interface Props {
  children: React.ReactNode
  require: 'admin' | 'agent' | 'user'
}

function getPlatformSettings() {
  // DEPRECATED: no longer reads from localStorage
  return {}
}

// Simple in-memory cache for settings (avoids re-fetch on every mount)
let _settingsCache: { data: Record<string, any> | null; ts: number } | null = null
const SETTINGS_CACHE_TTL = 30_000 // 30 seconds

function getMaintSchedule() {
  // DEPRECATED: no longer reads from localStorage
  return { start: '', end: '', message: "We're performing scheduled maintenance. We'll be back shortly." }
}

/* Countdown component */
function Countdown({ targetTime }: { targetTime: string }) {
  const calcRemaining = () => {
    const diff = new Date(targetTime).getTime() - Date.now()
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { h, m, s, total: diff }
  }

  const [rem, setRem] = useState(calcRemaining)

  useEffect(() => {
    if (!targetTime) return
    const t = setInterval(() => {
      const r = calcRemaining()
      setRem(r)
      if (!r) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [targetTime])

  if (!rem) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
      {[
        { label: 'Hours',   value: rem.h },
        { label: 'Minutes', value: rem.m },
        { label: 'Seconds', value: rem.s },
      ].map(({ label, value }) => (
        <div key={label} style={{
          textAlign: 'center', background: '#fff',
          borderRadius: 12, padding: '12px 16px', minWidth: 64,
          boxShadow: '0 2px 12px rgba(239,68,68,0.15)',
          border: '1px solid #fecaca',
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', lineHeight: 1 }}>
            {pad(value)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

/* Maintenance Page */
function MaintenancePage({ endTime, message, telegramSupport }: { endTime: string; message: string; telegramSupport?: string }) {
  const handle = telegramSupport || 'bittxsmssupport'
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)', padding: 20,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* Animated gear */}
        <div style={{ fontSize: 64, marginBottom: 8,
          animation: 'spin 4s linear infinite', display: 'inline-block' }}>⚙️</div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', margin: '12px 0 8px' }}>
          Under Maintenance
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
          {message}
        </p>

        {/* Countdown if end time set */}
        {endTime && new Date(endTime).getTime() > Date.now() && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Back online in
            </p>
            <Countdown targetTime={endTime} />
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
              Expected: {new Date(endTime).toLocaleString()}
            </p>
          </div>
        )}

        {!endTime && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%', background: '#dc2626',
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}/>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px',
          border: '1px solid #fecaca', display: 'inline-block' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Need help? Contact us on Telegram:{' '}
            <a href={`https://t.me/${handle}`}
              target="_blank" rel="noreferrer"
              style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
              @{handle}
            </a>
          </p>
        </div>

        <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 20 }}>
          BITTX SMS · Real-Time OTP Platform
        </p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, require }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [timedOut, setTimedOut] = useState(false)
  const [dbSettings, setDbSettings] = useState<Record<string, any> | null>(null)

  // Load platform settings from DB (not localStorage) — cached for 30s
  useEffect(() => {
    if (_settingsCache && Date.now() - _settingsCache.ts < SETTINGS_CACHE_TTL) {
      setDbSettings(_settingsCache.data || {})
      return
    }
    settingsApi.get()
      .then(data => { _settingsCache = { data: data || {}, ts: Date.now() }; setDbSettings(data || {}) })
      .catch(() => { _settingsCache = { data: {}, ts: Date.now() }; setDbSettings({}) })
  }, [])

  // Safety timeout — if loading takes > 4s (server unreachable), proceed with cached session
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setTimedOut(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  if (loading && !timedOut) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #7c3aed',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
          <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    if (require === 'admin') return <Navigate to="/admin/login" replace />
    if (require === 'agent') return <Navigate to="/agent/login" replace />
    return <Navigate to="/login" replace />
  }

  // Role mismatch
  if (require === 'admin' && !['admin', 'superadmin', 'moderator', 'support'].includes(user.role)) {
    return <Navigate to="/admin/login" replace />
  }
  if (require === 'agent' && user.role !== 'agent') {
    return <Navigate to="/agent/login" replace />
  }
  if (require === 'user' && !['user'].includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  // Status check — banned/suspended/inactive users cannot access
  if (user.status === 'banned' || user.status === 'suspended' || user.status === 'inactive') {
    return <Navigate to="/login" replace />
  }
  // Pending with completed profile = waiting admin approval — block access
  if (user.status === 'pending' && user.profileComplete === true) {
    return <Navigate to="/login" replace />
  }

  // Maintenance mode check (skip for admin) — uses DB settings only
  if (require !== 'admin' && dbSettings) {
    // Settings structure: { platform: { maintenanceMode }, maintenance: { endTime, message } }
    const platformData = dbSettings.platform || dbSettings
    const isMaintenanceMode = platformData.maintenanceMode === true || platformData.maintenanceMode === 'true'
    if (isMaintenanceMode) {
      const maintData = dbSettings.maintenance || {}
      const endTime = maintData.endTime || ''
      const message = maintData.message || "We're performing scheduled maintenance. We'll be back shortly."
      const telegramHandle = platformData.telegramSupport || ''
      // If end time has passed, maintenance is over
      if (!endTime || new Date(endTime).getTime() > Date.now()) {
        return <MaintenancePage endTime={endTime} message={message} telegramSupport={telegramHandle} />
      }
    }
  }

  // User profile not complete — force redirect to /complete-profile
  // (Login.tsx already sends them here directly, but this is a safety net)
  if (require === 'user' && !user.profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }
  // Once profile is complete, prevent users from going back to /complete-profile
  if (require === 'user' && user.profileComplete === true && location.pathname === '/complete-profile') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
