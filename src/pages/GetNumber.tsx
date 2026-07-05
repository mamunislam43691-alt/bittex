import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Check, Hash, ChevronDown, Clock, X, Copy } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { COUNTRIES } from '../lib/countries'
import { onOTPReceived, onOTPFailed } from '../lib/socket'
import { spApi, otpsApi } from '../lib/api'
import { notifyOTP } from '../lib/notificationService'

type NumberStatus = 'pending' | 'success' | 'failed'

interface NumberEntry {
  id: string
  number: string
  country: string
  operator: string
  status: NumberStatus
  time: string
  otp: string | null
  service: string | null
  allocatedAt: number  // timestamp ms
}

/* ── OTP Timer row ── auto-fail at 20min ── */
function OTPTimerRow({ entry, onFail, onOTPCopied }: {
  entry: NumberEntry
  onFail: (id: string) => void
  onOTPCopied?: () => void
}) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - entry.allocatedAt) / 1000))
  const [copied, setCopied] = useState(false)
  const [numCopied, setNumCopied] = useState(false)
  const [numHovered, setNumHovered] = useState(false)
  const MAX_SECS = 20 * 60  // 20 minutes

  useEffect(() => {
    if (entry.status !== 'pending') return
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - entry.allocatedAt) / 1000)
      setElapsed(secs)
      if (secs >= MAX_SECS) { onFail(entry.id); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [entry.id, entry.status, entry.allocatedAt])

  const remaining = Math.max(0, MAX_SECS - elapsed)
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const pct = (remaining / MAX_SECS) * 100

  const copyOTP = () => {
    if (!entry.otp) return
    navigator.clipboard.writeText(entry.otp)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
    onOTPCopied?.()
  }

  const copyNumber = () => {
    navigator.clipboard.writeText(entry.number).catch(() => {})
    setNumCopied(true); setTimeout(() => setNumCopied(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Number — click to copy with hover tooltip */}
      <span
        className="mask-num"
        onClick={copyNumber}
        onMouseEnter={() => setNumHovered(true)}
        onMouseLeave={() => setNumHovered(false)}
        style={{
          position: 'relative',
          fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
          color: numCopied ? '#16a34a' : 'var(--text-primary)',
          cursor: 'pointer', lineHeight: 1.3,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          transition: 'color 0.15s',
          userSelect: 'none',
        }}>
        {entry.number}
        {/* Copy icon on hover */}
        {(numHovered || numCopied) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {numCopied
              ? <Check size={11} style={{ color: '#16a34a' }} />
              : <Copy size={11} style={{ color: '#94a3b8' }} />
            }
          </span>
        )}
        {/* Tooltip */}
        {numHovered && (
          <span style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
            background: 'rgba(15,23,42,0.92)', color: '#fff',
            fontSize: 11, fontWeight: 600, padding: '4px 9px',
            borderRadius: 6, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 100,
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {numCopied ? '✓ Copied!' : '📋 Click to copy number'}
            <span style={{
              position: 'absolute', top: '100%', left: 16,
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid rgba(15,23,42,0.92)',
            }} />
          </span>
        )}
      </span>

      {/* PENDING */}
      {entry.status === 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: '#fef9c3', color: '#b45309', display: 'inline-block', lineHeight: 1.4 }}>
            PENDING
          </span>
          <Clock size={9} style={{ color: remaining < 120 ? '#ef4444' : '#f59e0b', flexShrink: 0 }}/>
          <div style={{ width: 48, height: 3, background: '#e2e8f0', borderRadius: 2, flexShrink: 0 }}>
            <div style={{ height: '100%', borderRadius: 2, transition: 'width 1s linear',
              background: remaining < 60 ? '#ef4444' : remaining < 120 ? '#f59e0b' : '#22c55e',
              width: `${pct}%` }}/>
          </div>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
            color: remaining < 60 ? '#ef4444' : '#94a3b8', flexShrink: 0 }}>
            {mm}:{ss}
          </span>
        </div>
      )}

      {/* SUCCESS */}
      {entry.status === 'success' && entry.otp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: '#dcfce7', color: '#15803d', display: 'inline-block', lineHeight: 1.4 }}>
            SUCCESS ✓
          </span>
          <span
            onClick={copyOTP}
            title="Click to copy OTP"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
              background: copied ? '#dcfce7' : '#f0fdf4',
              border: `1px solid ${copied ? '#86efac' : '#bbf7d0'}`,
              borderRadius: 6, padding: '2px 10px', cursor: 'pointer',
              transition: 'all 0.12s', userSelect: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace',
              color: copied ? '#16a34a' : '#15803d', letterSpacing: '0.1em' }}>
              {entry.otp}
            </span>
            {copied && <Check size={9} style={{ color: '#16a34a', flexShrink: 0 }}/>}
          </span>
          {/* Service shown next to OTP */}
          {entry.service && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
              background: '#ede9fe', color: '#7c3aed', flexShrink: 0 }}>
              {entry.service}
            </span>
          )}
        </div>
      )}

      {/* FAILED */}
      {entry.status === 'failed' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: '#fee2e2', color: '#dc2626',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            lineHeight: 1.4, width: 'fit-content',
          }}>
            FAILED <X size={9} style={{ color: '#dc2626' }}/>
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Services list derived from availableRanges (fetched from API) ── */

type Filter   = 'all' | 'success' | 'failed' | 'pending'
type ActiveTab = 'range' | 'search' | 'access'

/* Reusable styled select */
function StyledSelect({
  value, onChange, disabled = false, children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        style={{
          width: '100%', padding: '10px 36px 10px 14px', fontSize: 14,
          borderRadius: 10, border: '1px solid var(--border)',
          background: disabled ? 'var(--input-bg)' : 'var(--bg-card)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          appearance: 'none', outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box', opacity: disabled ? 0.7 : 1,
        }}
      >
        {children}
      </select>
      <ChevronDown size={15} style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none',
      }} />
    </div>
  )
}

export default function GetNumber() {
  const { accentColor } = useTheme()

  const [filter,          setFilter]          = useState<Filter>('all')
  const [activeTab,       setActiveTab]       = useState<ActiveTab>('range')
  const [rangeValue,      setRangeValue]      = useState('')
  const [formatMode, setFormatMode] = useState<'national' | 'remove' | null>('national')
  const nationalFormat = formatMode === 'national'
  const removeFormat   = formatMode === 'remove'
  const [leftSearch,      setLeftSearch]      = useState('')
  const [showMore,        setShowMore]        = useState(false)
  // Mobile left panel toggle
  const [showLeftPanel,   setShowLeftPanel]   = useState(false)
  // SEARCH tab
  const [selectedCountryOp, setSelectedCountryOp] = useState('Afghanistan - Etisalat')
  const [searchRange,        setSearchRange]        = useState('')
  const [searchShowMore,     setSearchShowMore]     = useState(false)
  // ACCESS tab
  const [selectedService, setSelectedService] = useState('')
  const [accessRange,     setAccessRange]     = useState('')
  const [accessShowMore,  setAccessShowMore]  = useState(false)
  // Numbers with OTP timer — loaded from DB (no localStorage)
  const [numbers, setNumbers] = useState<NumberEntry[]>([])
  // Toast
  const [toastVisible,    setToastVisible]    = useState(false)
  const [toastMsg,        setToastMsg]        = useState('Number Allocated!')

  // Dynamic ranges fetched from backend service-providers API
  const [availableRanges, setAvailableRanges] = useState<{ range: string; services: string[] }[]>([])
  // Countries that have service providers with ranges
  const [activeCountries, setActiveCountries] = useState<{ country: string; ranges: string[]; services: string[] }[]>([])

  useEffect(() => {
    // Load all 3 data sources in parallel on mount
    Promise.allSettled([
      spApi.getRanges(),
      spApi.getCountriesServices(),
      otpsApi.list({ limit: 100 }),
    ]).then(([rangesRes, countriesRes, logsRes]) => {
      // Ranges
      if (rangesRes.status === 'fulfilled') {
        setAvailableRanges((rangesRes.value as any)?.ranges || [])
      }
      // Countries
      if (countriesRes.status === 'fulfilled') {
        setActiveCountries((countriesRes.value as any)?.countries || [])
      }
      // OTP logs
      if (logsRes.status === 'fulfilled') {
        const logs: any[] = (logsRes.value as any)?.logs || []
        setNumbers(logs.map((l: any) => ({
          id: String(l._id || l.id),
          number: l.number || '—',
          country: l.country || 'Unknown',
          operator: l.operator || 'Mobile',
          status: (l.status === 'success' ? 'success' : l.status === 'failed' ? 'failed' : 'pending') as NumberStatus,
          time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now',
          otp: l.otp || null,
          service: l.service || null,
          allocatedAt: l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
        })))
      }
    }).catch(() => {})
    // Clean up stale localStorage
    try { localStorage.removeItem('bittx_numbers') } catch {}
  }, [])

  const showToast = (msg = 'Number Allocated!') => {
    setToastMsg(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  // Load OTP logs from DB on refresh (initial load happens in the parallel mount useEffect above)
  const fetchNumbers = useCallback(async () => {
    try {
      const res = await otpsApi.list({ limit: 100 })
      const logs: any[] = res?.logs || []
      setNumbers(logs.map((l: any) => ({
        id: String(l._id || l.id),
        number: l.number || '—',
        country: l.country || 'Unknown',
        operator: l.operator || 'Mobile',
        status: (l.status === 'success' ? 'success' : l.status === 'failed' ? 'failed' : 'pending') as NumberStatus,
        time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now',
        otp: l.otp || null,
        service: l.service || null,
        allocatedAt: l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
      })))
    } catch {}
  }, [])

  /* Listen for real OTP received / failed events via socket */
  useEffect(() => {
    const unsubReceived = onOTPReceived((data) => {
      setNumbers(p => {
        const idx = p.findIndex(n => n.number === data.number && n.status === 'pending')
        if (idx === -1) return p
        const updated = [...p]
        updated[idx] = { ...updated[idx], status: 'success', otp: data.otp, service: data.service || null }
        return updated
      })
      showToast(`✓ OTP received: ${data.otp}`)
      navigator.clipboard.writeText(data.otp).catch(() => {})

      // 🔔 Browser push notification + audio chime
      notifyOTP({
        number:  data.number  || '',
        otp:     data.otp     || '',
        service: data.service || '',
        earned:  data.earned  ?? undefined,
      })
    })
    // Server auto-fails after 20min — sync UI
    const unsubFailed = onOTPFailed((data) => {
      setNumbers(p => {
        const idx = p.findIndex(n => n.number === data.number && n.status === 'pending')
        if (idx === -1) return p
        const updated = [...p]
        updated[idx] = { ...updated[idx], status: 'failed' }
        return updated
      })
      // Refresh from DB to ensure stats are up-to-date
      fetchNumbers()
    })
    return () => { unsubReceived(); unsubFailed() }
  }, [fetchNumbers])

  // Client-side timer fail (UI only; server timeout already saved to DB)
  const handleFail = (id: string) =>
    setNumbers(p => p.map(n => n.id === id ? { ...n, status: 'failed' } : n))

  const handleGetNumber = async () => {
    const rawRange = activeTab === 'range' ? rangeValue
      : activeTab === 'search' ? searchRange
      : accessRange
    const range = rawRange.replace(/XXX$/i, '').replace(/^#/, '').trim()

    if (!range) {
      showToast('✗ Please enter a number range first')
      return
    }

    try {
      const result = await otpsApi.allocate(range, undefined)
      const actualNumber = result?.number
      if (!actualNumber) {
        showToast('✗ No numbers available for this range')
        return
      }
      const logId = result?.logId || ('n' + Date.now())

      const detectedCountry = COUNTRIES.find(c => {
        const code = c.dialCode.replace('+', '')
        return actualNumber.startsWith(code)
      })

      let copyNum = actualNumber
      if (removeFormat && detectedCountry) {
        const code = detectedCountry.dialCode.replace('+', '')
        copyNum = actualNumber.startsWith(code) ? actualNumber.slice(code.length) : actualNumber
      }

      navigator.clipboard.writeText(copyNum).catch(() => {})

      const newEntry: NumberEntry = {
        id: String(logId),
        number: removeFormat ? copyNum : actualNumber,
        country: result?.country || detectedCountry?.name || 'Unknown',
        operator: result?.operator || 'Mobile',
        status: 'pending',
        time: 'just now',
        otp: null,
        service: null,
        allocatedAt: Date.now(),
      }
      setNumbers(p => [newEntry, ...p])
      showToast(removeFormat ? `✓ Copied (no code): ${copyNum}` : `✓ Number copied: ${copyNum}`)
    } catch (err: any) {
      const msg = err?.message || 'No numbers available for this range'
      showToast(`✗ ${msg}`)
    }
  }

  /* Get services for a given range from dynamic availableRanges (fetched from API) */
  const getServicesForRange = (range: string) => {
    const key = range.replace(/^#/, '')
    const found = availableRanges.find(r => r.range === key || r.range === range)
    return found?.services || []
  }

  /* Derived: only services that actually have ranges configured */
  const servicesList = [...new Set(availableRanges.flatMap(r => r.services))].sort()

  const successCount = numbers.filter(n => n.status === 'success').length
  const failedCount  = numbers.filter(n => n.status === 'failed').length
  const pendingCount = numbers.filter(n => n.status === 'pending').length
  const successRate  = numbers.length > 0
    ? ((successCount / numbers.length) * 100).toFixed(1)
    : '0.0'

  const filtered = numbers.filter(n => {
    if (filter !== 'all' && n.status !== filter) return false
    if (leftSearch && !n.number.includes(leftSearch)) return false
    return true
  })

  /* Radio-style checkbox — only one can be active at a time */
  const RadioCheck = ({ active, onSelect, label }: { active: boolean; onSelect: () => void; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
      <div
        onClick={onSelect}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${active ? accentColor : '#cbd5e1'}`,
          background: active ? accentColor : 'var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        {active && <Check size={10} color="#fff" />}
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  )

  /* Already hit banner — reused across all tabs */
  const AlreadyHitBanner = ({
    range, showMore: sm, setShowMore: setSm,
  }: { range: string; showMore: boolean; setShowMore: (v: boolean) => void }) => {
    const svcs = getServicesForRange(range)
    if (!range || svcs.length === 0) return null
    const visible = sm ? svcs : svcs.slice(0, 5)
    const extra   = svcs.length - 5
    return (
      <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10,
        background: '#fffbeb', border: '1px solid #fde68a' }}
        className="dark:bg-amber-900/10 dark:border-amber-800/40">
        {/* Header — compact single line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>⚡</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            HIT · <span style={{ fontFamily: 'monospace' }}>{range}</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
            flexShrink: 0, whiteSpace: 'nowrap' }}>
            {svcs.length} SVC
          </span>
        </div>
        {/* Service tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {visible.map(svc => (
            <span key={svc} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, background: '#fff', border: '1px solid #fde68a',
              color: '#b45309', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {svc}
            </span>
          ))}
          {!sm && extra > 0 && (
            <button onClick={() => setSm(true)}
              style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: '#fff', border: '1px solid #fde68a', color: accentColor,
                cursor: 'pointer', whiteSpace: 'nowrap' }}>
              +{extra} more
            </button>
          )}
        </div>
      </div>
    )
  }

  /* Shared bottom row */
  const BottomRow = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Format + button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <RadioCheck
            active={nationalFormat}
            onSelect={() => setFormatMode(nationalFormat ? null : 'national')}
            label="National Format"
          />
          <RadioCheck
            active={removeFormat}
            onSelect={() => setFormatMode(removeFormat ? null : 'remove')}
            label="Remove (+)"
          />
        </div>
        <button
          onClick={handleGetNumber}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 24, fontSize: 14, fontWeight: 700,
            background: accentColor, color: '#fff', border: 'none', cursor: 'pointer',
            transition: 'opacity 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <><RefreshCw size={15}/> Get Number</>
        </button>
      </div>
    </div>
  )

  return (
    <div className="page-wrap">
      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? 0 : 16}px)`,
        opacity: toastVisible ? 1 : 0, transition: 'opacity 0.25s, transform 0.25s',
        background: 'rgba(15,23,42,0.92)', color: '#fff', padding: '10px 22px',
        borderRadius: 999, fontSize: 14, fontWeight: 600, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1s infinite' }}/>
        {toastMsg}
      </div>
      {/* ── Page Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${accentColor}` }} />
          <h1 className="page-title">Get Number</h1>
        </div>
        <p className="page-sub">Allocate numbers from a prefix range and watch incoming OTPs.</p>
      </div>

      {/* ── Mobile: Show filters toggle ── */}
      <button
        onClick={() => setShowLeftPanel(v => !v)}
        className="mobile-filter-btn"
        style={{ width: '100%', padding: '10px 16px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 600,
          color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚙️ Show filters &amp; stats
          {pendingCount > 0 && (
            <span style={{ background: accentColor, color: '#fff', borderRadius: '50%',
              width: 18, height: 18, fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {pendingCount}
            </span>
          )}
        </span>
        <span style={{ fontSize: 12 }}>{showLeftPanel ? '▲' : '▼'}</span>
      </button>

      {/* ── Main 2-column layout ── */}
      <div className="get-number-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

        {/* ══ LEFT PANEL ══ */}
        <div className={`card get-number-left-panel ${showLeftPanel ? 'mobile-panel-open' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', height: 'fit-content', minHeight: 300, maxHeight: 480 }}>

          {/* Search */}
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search numbers..."
                value={leftSearch}
                onChange={e => setLeftSearch(e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  fontSize: 13, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Filter buttons — 2×2 grid */}
          <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {([
              { key: 'all',     label: 'All',     icon: null,                               iconColor: '' },
              { key: 'success', label: 'Success', icon: <Check size={13} />,               iconColor: '#22c55e' },
              { key: 'failed',  label: 'Failed',  icon: <span style={{ fontSize: 13 }}>✕</span>, iconColor: '#ef4444' },
              { key: 'pending', label: 'Pending', icon: <span style={{ fontSize: 12 }}>⏳</span>, iconColor: '#f59e0b' },
            ] as { key: Filter; label: string; icon: React.ReactNode; iconColor: string }[]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${filter === f.key ? accentColor : 'var(--border)'}`,
                  background: filter === f.key ? accentColor : 'var(--bg-card)',
                  color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {f.icon && (
                  <span style={{ color: filter === f.key ? '#fff' : f.iconColor }}>{f.icon}</span>
                )}
                {f.label}
              </button>
            ))}
          </div>

          {/* Success Rate */}
          <div style={{
            padding: '10px 18px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: '#94a3b8' }}>SUCCESS RATE</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{successRate}%</span>
          </div>

          {/* Status rows */}
          <div style={{ flex: 'none' }}>
            {[
              { label: 'Success', count: successCount, bg: '#dcfce7', dot: '#22c55e' },
              { label: 'Failed',  count: failedCount,  bg: '#fee2e2', dot: '#ef4444' },
              { label: 'Pending', count: pendingCount, bg: '#fef9c3', dot: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 18px', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="get-number-right" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* ── Top control card ── */}
          <div className="card" style={{ padding: '20px 24px' }}>

            {/* Label + tabs + advance toggle */}
            <div style={{ marginBottom: 14 }}>
              {/* Top: Label */}
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: accentColor, display: 'block', marginBottom: 10 }}>
                {activeTab === 'range' ? 'ENTER NUMBER RANGE'
                  : activeTab === 'search' ? 'COUNTRY & RANGE'
                  : 'SERVICE & RANGE'}
              </span>
              {/* Bottom: Tabs + Advance toggle in one row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                {(['range', 'search', 'access'] as ActiveTab[]).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
                      border: `1.5px solid ${activeTab === tab ? accentColor : 'var(--border)'}`,
                      background: activeTab === tab ? accentColor : 'var(--bg-card)',
                      color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                    {tab.toUpperCase()}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                </div>
              </div>
            </div>

            {/* ── RANGE tab content ── */}
            {activeTab === 'range' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--input-bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0, userSelect: 'none' }}>#</span>
                  <input
                    type="text"
                    value={rangeValue}
                    onChange={e => setRangeValue(e.target.value)}
                    style={{ flex: 1, fontSize: 18, fontWeight: 700, border: 'none', outline: 'none',
                      background: 'transparent', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                    placeholder="2290195XXX"
                  />
                </div>

                <BottomRow />

                <AlreadyHitBanner range={rangeValue} showMore={showMore} setShowMore={setShowMore} />
              </>
            )}
            {activeTab === 'search' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>
                    COUNTRY &amp; OPERATOR
                  </p>
                  <StyledSelect value={selectedCountryOp} onChange={v => { setSelectedCountryOp(v); setSearchRange(''); setSearchShowMore(false) }}>
                    <option value="">{activeCountries.length ? 'Select country...' : 'No countries configured'}</option>
                    {activeCountries.map(c => {
                      const flag = COUNTRIES.find(cc => cc.name === c.country)?.flag || '🌍'
                      return (
                        <option key={c.country} value={c.country}>
                          {flag} {c.country} ({c.ranges.length} range{c.ranges.length !== 1 ? 's' : ''})
                        </option>
                      )
                    })}
                  </StyledSelect>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>RANGE</p>
                  <StyledSelect value={searchRange} onChange={v => { setSearchRange(v); setSearchShowMore(false) }}
                    disabled={!selectedCountryOp}>
                    <option value="">{selectedCountryOp ? 'Select a range...' : 'Pick a country first'}</option>
                    {selectedCountryOp && activeCountries
                      .filter(c => c.country === selectedCountryOp)
                      .flatMap(c => c.ranges)
                      .map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                  </StyledSelect>
                </div>
                <BottomRow />
                <AlreadyHitBanner range={searchRange} showMore={searchShowMore} setShowMore={setSearchShowMore} />
              </>
            )}

            {/* ── ACCESS tab content ── */}
            {activeTab === 'access' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>SERVICE</p>
                  <StyledSelect value={selectedService} onChange={v => { setSelectedService(v); setAccessRange(''); setAccessShowMore(false) }}>
                    <option value="">{servicesList.length ? 'Select a service...' : 'No services configured'}</option>
                    {servicesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </StyledSelect>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>RANGE</p>
                  <StyledSelect
                    value={accessRange}
                    onChange={v => { setAccessRange(v); setAccessShowMore(false) }}
                    disabled={!selectedService}
                  >
                    <option value="">{selectedService ? 'Select a range...' : 'Pick a service first'}</option>
                    {selectedService && availableRanges
                      .filter(r => r.services.includes(selectedService))
                      .map(r => (
                        <option key={r.range} value={r.range}>{r.range}</option>
                      ))}
                  </StyledSelect>
                </div>
                <BottomRow />
                <AlreadyHitBanner range={accessRange} showMore={accessShowMore} setShowMore={setAccessShowMore} />
              </>
            )}
          </div>

          {/* ── Number List table ── */}
          <div className="card" style={{ overflow: 'visible' }}>
            {/* Table header bar with stats */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              {/* "X–X of X" summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {filtered.length > 0 ? `1–${filtered.length} of ${filtered.length}` : '0 of 0'}
                </span>
                {numbers.length > 0 && (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                      background: '#dcfce7', color: '#16a34a' }}>
                      ✓ {successCount} success
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                      background: '#fee2e2', color: '#dc2626' }}>
                      ✕ {failedCount} failed
                    </span>
                    {pendingCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                        background: '#fef9c3', color: '#b45309' }}>
                        ⏳ {pendingCount} pending
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: parseFloat(successRate) >= 60 ? '#16a34a' : '#ef4444' }}>
                      {successRate}% rate
                    </span>
                  </>
                )}
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => { fetchNumbers(); showToast('Refreshed!') }}
                className="hover:text-slate-900 dark:hover:text-slate-200">
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            {/* Column headers */}
            <div className="num-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px',
              padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--input-bg)' }}>
              {[
                { h: 'NUMBER INFO', hint: '📋 Click number to copy' },
                { h: 'COUNTRY / OPERATOR', hint: '' },
                { h: 'TIME', hint: '' },
              ].map(({ h, hint }) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {h}
                  {hint && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#c4b5fd',
                      textTransform: 'none', letterSpacing: 0, fontFamily: 'system-ui' }}>
                      {hint}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Hash size={28} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, color: '#94a3b8' }}>No numbers found</p>
              </div>
            ) : filtered.map(n => (
              <div key={n.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 num-table-row"
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px',
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  transition: 'background 0.12s', alignItems: 'center', gap: 8,
                  borderLeft: n.status === 'success' ? '3px solid #22c55e' :
                              n.status === 'pending' ? '3px solid #f59e0b' : '3px solid transparent',
                  background: n.status === 'success' ? '#f0fdf420' : 'transparent' }}
              >
                {/* Col 1: Number + status + OTP */}
                <OTPTimerRow
                  entry={n}
                  onFail={handleFail}
                  onOTPCopied={() => showToast('OTP copied!')}
                />
                {/* Col 2: Country + operator (compact, no duplicate service) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{n.country}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10 }}>📶</span> {n.operator}
                  </span>
                </div>
                {/* Col 3: Time */}
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', textAlign: 'right' }}>{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
