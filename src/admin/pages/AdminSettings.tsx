import { useState, useEffect } from 'react'
import {
  Save, AlertTriangle, Settings, Activity, Shield, Bell,
  CheckCircle, Database, Copy, Check, DollarSign, ExternalLink,
  RefreshCw, Wifi, WifiOff, Bot, Eye, EyeOff, Trash2, Mail, Send, Lock,
  HardDrive, Cpu, MemoryStick, Clock, Download, Upload, Zap, Server,
  AlertCircle, BarChart3, Archive, Edit2, Ban, Power, Globe
} from 'lucide-react'
import { api, settingsApi } from '../../lib/api'

/* ─── Types ─────────────────────────────────── */
interface DBConfig { id: string; type: string; label: string; host: string; port: string; name: string; user: string; pass: string; connected: boolean }
interface AIProvider { id: string; name: string; provider: string; apiKey: string; baseUrl: string; model: string; enabled: boolean; useFor: string[] }

interface ConfirmDialogProps { open: boolean; title: string; message: string; confirmLabel?: string; confirmColor?: string; onConfirm: () => void; onCancel: () => void }
function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmColor = '#ef4444', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '95vw', padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: confirmColor === '#ef4444' ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <AlertTriangle size={24} color={confirmColor} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</p>
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: confirmColor, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  registrationEnabled: true,
  minWithdrawal: 5.00,
  maxWithdrawal: 500.00,
  withdrawalFee: 0.50,
  defaultCommission: 10,
  maxDailyOTP: 1000,
  apiRateLimit: 60,
  telegramSupport: '@bittxsmssupport',
}
const DB_TYPES = [
  { type: 'mongodb', label: 'MongoDB', icon: '🍃', color: '#22c55e', port: '27017', doc: 'MongoDB Atlas: cloud.mongodb.com → Free tier → Connection string' },
]

const AI_PROVIDERS = [
  { key: 'openai', label: 'OpenAI', icon: '🤖', color: '#22c55e', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], doc: 'https://platform.openai.com/api-keys' },
  { key: 'claude', label: 'Claude', icon: '🎭', color: '#f59e0b', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'], doc: 'https://console.anthropic.com' },
  { key: 'gemini', label: 'Gemini', icon: '💎', color: '#6366f1', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], doc: 'https://aistudio.google.com/app/apikey' },
  { key: 'deepseek', label: 'DeepSeek', icon: '🌊', color: '#0ea5e9', models: ['deepseek-chat', 'deepseek-coder'], doc: 'https://platform.deepseek.com' },
  { key: 'groq', label: 'Groq', icon: '⚡', color: '#ef4444', models: ['llama-3.1-70b', 'mixtral-8x7b'], doc: 'https://console.groq.com' },
  { key: 'mistral', label: 'Mistral', icon: '🌪️', color: '#8b5cf6', models: ['mistral-large', 'mistral-medium'], doc: 'https://console.mistral.ai' },
  { key: 'custom', label: 'Custom', icon: '🔧', color: '#475569', models: ['custom'], doc: 'Your custom API endpoint (Ollama, LM Studio, etc.)' },
]

const AI_USE_CASES = ['Support Chat', 'OTP Assistance', 'User Onboarding', 'FAQ Answering', 'Transaction Help']


/* ─── Small helpers ──────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1400) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 11,
        fontWeight: 600, border: '1px solid #e2e8f0', background: c ? '#dcfce7' : '#fff',
        color: c ? '#16a34a' : '#475569', cursor: 'pointer', flexShrink: 0
      }}>
      {c ? <Check size={9} /> : <Copy size={9} />} {c ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [otpUserRate, setOtpUserRate] = useState(0.005)
  const [otpAgentComm, setOtpAgentComm] = useState(15)
  // DB
  const [dbConfigs, setDbConfigs] = useState<DBConfig[]>([])
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [showDbAdd, setShowDbAdd] = useState(false)
  const [dbTesting, setDbTesting] = useState(false)
  const [dbTestMsg, setDbTestMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [newDb, setNewDb] = useState<DBConfig>({ id: '', type: 'mongodb', label: 'MongoDB', host: '', port: '27017', name: 'bittxsms', user: '', pass: '', connected: false })
  const [viewDbId, setViewDbId] = useState<string | null>(null)
  const [confirmDeleteDbId, setConfirmDeleteDbId] = useState<string | null>(null)
  const [confirmDisconnectPrimary, setConfirmDisconnectPrimary] = useState(false)
  const [dbAutoSetup, setDbAutoSetup] = useState(true)
  const [dbSmartSync, setDbSmartSync] = useState(false)
  const [dbInputMode, setDbInputMode] = useState<'form' | 'uri'>('form')
  const [dbUri, setDbUri] = useState('')
  // Security
  const [security, setSecurity] = useState({ apiAccessDefault: true, twoFactor: false, ipWhitelist: false })
  // Notifications
  const [notifs, setNotifs] = useState({ newWithdrawal: true, newRegistration: true, lowBalance: false, supportTicket: true })
  // Danger zone
  const [dangerConfirm, setDangerConfirm] = useState<string | null>(null)
  const [dangerDone, setDangerDone] = useState<string | null>(null)
  const [dangerLoading, setDangerLoading] = useState<string | null>(null)
  // AI
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [showAiAdd, setShowAiAdd] = useState(false)
  const [showAiKeys, setShowAiKeys] = useState<Record<string, boolean>>({})
  const [newAi, setNewAi] = useState<AIProvider>({ id: '', name: '', provider: 'openai', apiKey: '', baseUrl: '', model: 'gpt-4o', enabled: true, useFor: ['Support Chat'] })
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [modelFetchErr, setModelFetchErr] = useState('')

  // Platform schedule state — loaded from DB, NOT localStorage
  const [maintStartTime, setMaintStartTime] = useState('')
  const [maintEndTime, setMaintEndTime] = useState('')
  const [maintMessage, setMaintMessage] = useState("We are performing scheduled maintenance. We'll be back shortly.")
  const [regStartTime, setRegStartTime] = useState('')
  const [regEndTime, setRegEndTime] = useState('')
  const [gmailUser, setGmailUser] = useState('')
  const [gmailAppPass, setGmailAppPass] = useState('')

  // Landing Page customization
  const [landingStats, setLandingStats] = useState([
    { label: 'OTP Sessions', value: 25000, suffix: '+' },
    { label: 'Numbers Routed', value: 250, suffix: 'K+' },
    { label: 'Uptime', value: 98, suffix: '%' },
    { label: 'Active Users', value: 4000, suffix: '+' },
  ])
  const [landingHero, setLandingHero] = useState({ headline: 'Virtual Numbers for Instant OTP Verification', subtext: 'Rent temporary phone numbers, monitor SMS codes in real-time, and automate OTP workflows — all from one powerful panel.' })
  const [landingBadge, setLandingBadge] = useState('REAL-TIME OTP PLATFORM')
  const [landingCtaPrimary, setLandingCtaPrimary] = useState('Start Free Now')
  const [landingCtaSecondary, setLandingCtaSecondary] = useState('Sign In')
  const [landingServicesVisible, setLandingServicesVisible] = useState(true)
  const [landingTestimonialsVisible, setLandingTestimonialsVisible] = useState(true)
  const [showGmailPass, setShowGmailPass] = useState(false)
  const [emailTestAddr, setEmailTestAddr] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailTestMsg, setEmailTestMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [emailGuideOpen, setEmailGuideOpen] = useState(false)

  const saveEmailConfig = async () => {
    if (!gmailUser || !gmailAppPass) return
    setEmailSaving(true)
    try {
      // Save to server only
      await api.post('/email/config', { gmailUser, gmailAppPass })
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 2500)
      flash('Email configuration saved!')
    } catch (e: any) {
      flash('Failed to save email config: ' + (e.message || 'Server error'))
    } finally {
      setEmailSaving(false)
    }
  }

  const testEmail = async () => {
    if (!emailTestAddr || !gmailUser) return
    setEmailTesting(true); setEmailTestMsg(null)
    try {
      await api.post('/email/send-otp', {
        email: emailTestAddr,
        name: 'Admin Test',
        type: 'verify',
      })
      setEmailTestMsg({ ok: true, msg: `Test email sent to ${emailTestAddr}` })
    } catch (e: any) {
      setEmailTestMsg({ ok: false, msg: e.message ?? 'Failed to send test email' })
    } finally {
      setEmailTesting(false)
    }
  }

  // Fetch models from provider API when apiKey changes
  const fetchModels = async (provider: string, apiKey: string) => {
    if (!apiKey || apiKey.length < 10) {
      setFetchedModels([])
      setModelFetchErr('')
      return
    }
    setFetchingModels(true); setModelFetchErr(''); setFetchedModels([])
    try {
      let models: string[] = []
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (!res.ok) throw new Error('Invalid API key or network error')
        const data = await res.json()
        models = (data.data as any[])
          .map((m: any) => m.id as string)
          .filter((id: string) => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3'))
          .sort()
      } else if (provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (!res.ok) throw new Error('Invalid API key')
        const data = await res.json()
        models = (data.data as any[]).map((m: any) => m.id as string).sort()
      } else if (provider === 'mistral') {
        const res = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (!res.ok) throw new Error('Invalid API key')
        const data = await res.json()
        models = (data.data as any[]).map((m: any) => m.id as string).sort()
      } else {
        // For Claude, Gemini, DeepSeek — use static lists (their APIs require different auth)
        models = AI_PROVIDERS.find(p => p.key === provider)?.models ?? []
      }
      if (models.length > 0) {
        setFetchedModels(models)
        setNewAi(p => ({ ...p, model: models[0] }))
      } else {
        setModelFetchErr('No models found')
      }
    } catch (e: any) {
      setModelFetchErr(e.message ?? 'Failed to fetch models')
      // Fallback to static list
      const staticModels = AI_PROVIDERS.find(p => p.key === provider)?.models ?? []
      setFetchedModels(staticModels)
    } finally {
      setFetchingModels(false)
    }
  }

  useEffect(() => {
    // Load database status and all settings in parallel
    Promise.allSettled([
      api.get('/database/status'),
      settingsApi.getAll(),
    ]).then(([dbRes, settingsRes]) => {
      // Database status
      if (dbRes.status === 'fulfilled') {
        const d = dbRes.value as any
        setDbStatus(d)
        if (d.configs) setDbConfigs(d.configs)
      }
      // Settings
      if (settingsRes.status === 'fulfilled') {
        const data = settingsRes.value as any
        if (data) {
          if (data.platform) setSettings((p: any) => ({ ...p, ...data.platform }))
          if (data.otpPricing) { setOtpUserRate(data.otpPricing.userRate ?? 0.005); setOtpAgentComm(data.otpPricing.agentComm ?? 15) }
          if (data.security) setSecurity(data.security)
          if (data.notifications) setNotifs(data.notifications)
          if (data.aiProviders) setAiProviders(data.aiProviders)
          if (data.maintenance) { setMaintStartTime(data.maintenance.startTime || ''); setMaintEndTime(data.maintenance.endTime || ''); setMaintMessage(data.maintenance.message || '') }
          if (data.registration) { setRegStartTime(data.registration.startTime || ''); setRegEndTime(data.registration.endTime || '') }
          if (data.email) { setGmailUser(data.email.gmailUser || ''); setGmailAppPass(data.email.gmailAppPass || '') }
          if (data.landingPage) {
            if (data.landingPage.stats) setLandingStats(data.landingPage.stats)
            if (data.landingPage.hero) setLandingHero(data.landingPage.hero)
            if (data.landingPage.badge !== undefined) setLandingBadge(data.landingPage.badge)
            if (data.landingPage.ctaPrimary !== undefined) setLandingCtaPrimary(data.landingPage.ctaPrimary)
            if (data.landingPage.ctaSecondary !== undefined) setLandingCtaSecondary(data.landingPage.ctaSecondary)
            if (data.landingPage.servicesVisible !== undefined) setLandingServicesVisible(data.landingPage.servicesVisible)
            if (data.landingPage.testimonialsVisible !== undefined) setLandingTestimonialsVisible(data.landingPage.testimonialsVisible)
          }
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const update = (k: string, v: any) => {
    setSettings((p: any) => ({ ...p, [k]: v }))
  }
  const flash = (msg: string) => { setSaved(true); setSaveMsg(msg); setTimeout(() => { setSaved(false); setSaveMsg('') }, 2500) }
  const handleSave = async () => {
    try {
      await settingsApi.save({
        platform: { maintenanceMode: settings.maintenanceMode, registrationEnabled: settings.registrationEnabled, telegramSupport: settings.telegramSupport },
        otpPricing: { userRate: otpUserRate, agentComm: otpAgentComm },
        security,
        notifications: notifs,
        aiProviders,
        maintenance: { startTime: maintStartTime, endTime: maintEndTime, message: maintMessage },
        registration: { startTime: regStartTime, endTime: regEndTime },
        email: { gmailUser, gmailAppPass },
        landingPage: {
          stats: landingStats,
          hero: landingHero,
          badge: landingBadge,
          ctaPrimary: landingCtaPrimary,
          ctaSecondary: landingCtaSecondary,
          servicesVisible: landingServicesVisible,
          testimonialsVisible: landingTestimonialsVisible,
        },
      })
      // Clean up old localStorage keys from previous version
      try {
        localStorage.removeItem('bittx_landing_settings')
        localStorage.removeItem('landing_theme')
        localStorage.removeItem('bittx_numbers')
      } catch {}
      flash('Settings saved successfully!')
    } catch (e: any) {
      flash('Failed to save: ' + (e.message || 'Unknown error'))
    }
  }

  const testDb = async () => {
    if (!newDb.host && !newDb.name && !dbUri) return
    setDbTesting(true); setDbTestMsg(null)
    try {
      let uri: string
      if (dbInputMode === 'uri' && dbUri) {
        uri = dbUri
      } else if (newDb.type === 'firebase') {
        uri = `firebase://${newDb.name}`
      } else if (newDb.type === 'supabase') {
        uri = newDb.host
      } else if (newDb.type === 'mongodb') {
        uri = `mongodb+srv://${newDb.user}:${newDb.pass}@${newDb.host}/${newDb.name}?retryWrites=true&w=majority`
      } else {
        uri = `${newDb.type}://${newDb.user}:${newDb.pass}@${newDb.host}:${newDb.port}/${newDb.name}`
      }
      const r = await api.post('/database/test', { uri, type: newDb.type, host: newDb.host, user: newDb.user, pass: newDb.pass, name: newDb.name })
      setDbTestMsg({ ok: true, msg: r.message })
    } catch (e: any) { setDbTestMsg({ ok: false, msg: e.message }) } finally { setDbTesting(false) }
  }
  const addDb = async () => {
    if (!newDb.host) return
    try {
      const payload: any = { ...newDb, autoSetup: dbAutoSetup, smartSync: dbSmartSync }
      if (dbInputMode === 'uri' && dbUri) payload.uri = dbUri
      const r = await api.post('/database/save', payload)
      setDbConfigs(p => [...p, r.config])
      setNewDb({ id: '', type: 'mongodb', label: 'MongoDB', host: '', port: '27017', name: 'bittxsms', user: '', pass: '', connected: false })
      setShowDbAdd(false); setDbTestMsg(null); setDbUri(''); setDbInputMode('form')
      const msgs = []
      if (r.config.setupResult) msgs.push(`${r.config.setupResult.created?.length || 0} collections created, ${r.config.setupResult.indexes?.length || 0} indexes`)
      if (r.config.syncResult) msgs.push(`${r.config.syncResult.synced?.reduce((a: number, s: any) => a + s.count, 0) || 0} documents synced`)
      flash(msgs.length ? `✓ Database connected! ${msgs.join('. ')}` : 'Database connected!')
    } catch (e: any) { setDbTestMsg({ ok: false, msg: e.message }) }
  }
  const removeDb = async (id: string) => { try { await api.delete(`/database/${id}`); setDbConfigs(p => p.filter(c => c.id !== id)) } catch { } }
  const refreshDb = () => api.get('/database/status').then(d => setDbStatus(d)).catch(() => { })

  const addAi = () => {
    if (!newAi.name || !newAi.apiKey) return
    setAiProviders(p => [...p, { ...newAi, id: 'ai' + Date.now() }])
    setNewAi({ id: '', name: '', provider: 'openai', apiKey: '', baseUrl: '', model: 'gpt-4o', enabled: true, useFor: ['Support Chat'] })
    setShowAiAdd(false); flash('AI provider added!')
  }

  const userNet = otpUserRate - (otpUserRate * otpAgentComm / 100)
  const agentEarn = otpUserRate * otpAgentComm / 100

  /* ── sub-components (inline) ── */
  const Toggle = ({ val, fn }: { val: boolean; fn: () => void }) => (
    <button onClick={fn} style={{
      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: val ? '#7c3aed' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0
    }}>
      <span style={{
        position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', left: val ? 24 : 4, transition: 'left 0.2s'
      }} />
    </button>
  )
  const SH = ({ icon, title, color = '#7c3aed' }: { icon: React.ReactNode; title: string; color?: string }) => (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color }}>{icon}</span>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
    </div>
  )
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 4 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <ConfirmDialog
        open={!!confirmDeleteDbId}
        title="Delete Database?"
        message={`This will permanently disconnect and remove "${dbConfigs.find(d => d.id === confirmDeleteDbId)?.label || ''}" from the list.`}
        confirmLabel="Delete"
        confirmColor="#ef4444"
        onConfirm={() => { if (confirmDeleteDbId) { removeDb(confirmDeleteDbId); setConfirmDeleteDbId(null) } }}
        onCancel={() => setConfirmDeleteDbId(null)}
      />

      <ConfirmDialog
        open={confirmDisconnectPrimary}
        title="Disconnect Primary MongoDB?"
        message="The server will lose connection to the primary database. You will need to reconnect it manually before performing any new operations."
        confirmLabel="Yes, Disconnect"
        confirmColor="#ef4444"
        onConfirm={async () => {
          setConfirmDisconnectPrimary(false)
          try {
            await api.post('/database/update-mongodb-uri', { uri: '' })
            flash('Primary MongoDB disconnected')
            refreshDb()
          } catch (e: any) { flash('Disconnect failed: ' + e.message) }
        }}
        onCancel={() => setConfirmDisconnectPrimary(false)}
      />
      {/* Toast */}
      {saveMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#0f172a', color: '#fff',
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <CheckCircle size={15} style={{ color: '#22c55e' }} /> {saveMsg}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>System Settings</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Configure platform-wide settings</p>
        </div>
        <button onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 14,
            fontWeight: 700, background: saved ? '#22c55e' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
          }}>
          <Save size={15} /> {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* ── 2-col grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Platform Controls */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <SH icon={<Settings size={15} />} title="Platform Controls" />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Maintenance Mode ── */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${settings.maintenanceMode ? '#fee2e2' : '#e2e8f0'}`,
                background: settings.maintenanceMode ? '#fff5f5' : '#fff'
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: settings.maintenanceMode ? '#ef4444' : '#1e293b', margin: 0 }}>
                    {settings.maintenanceMode ? '⚠️ Maintenance Mode ON' : 'Maintenance Mode'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Disables user & agent access during maintenance</p>
                </div>
                <Toggle val={settings.maintenanceMode} fn={() => update('maintenanceMode', !settings.maintenanceMode)} />
              </div>

              {/* Maintenance schedule — shown when ON */}
              {settings.maintenanceMode && (
                <div style={{
                  marginTop: 10, padding: '14px 14px', borderRadius: 10,
                  background: '#fff7f7', border: '1px dashed #fca5a5', display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🕐 Maintenance Window
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={lbl}>START TIME</label>
                      <input type="datetime-local" value={maintStartTime}
                        onChange={e => setMaintStartTime(e.target.value)}
                        style={{ ...inp, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={lbl}>END TIME</label>
                      <input type="datetime-local" value={maintEndTime}
                        onChange={e => setMaintEndTime(e.target.value)}
                        style={{ ...inp, fontSize: 12 }} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>MESSAGE TO USERS</label>
                    <textarea value={maintMessage} onChange={e => setMaintMessage(e.target.value)}
                      rows={2}
                      style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
                      placeholder="We are performing scheduled maintenance. We'll be back shortly." />
                  </div>
                  {maintStartTime && maintEndTime && (
                    <div style={{
                      fontSize: 11, color: '#dc2626', fontWeight: 600,
                      background: '#fee2e2', padding: '8px 10px', borderRadius: 8
                    }}>
                      ⏱ Maintenance scheduled: {new Date(maintStartTime).toLocaleString()} → {new Date(maintEndTime).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Registration ── */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${settings.registrationEnabled ? '#bbf7d0' : '#e2e8f0'}`,
                background: settings.registrationEnabled ? '#f0fdf4' : '#fff'
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: settings.registrationEnabled ? '#16a34a' : '#1e293b', margin: 0 }}>
                    Registration {settings.registrationEnabled ? '● Open' : '○ Closed'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Allow new user registrations</p>
                </div>
                <Toggle val={settings.registrationEnabled} fn={() => update('registrationEnabled', !settings.registrationEnabled)} />
              </div>

              {/* Registration time window — shown when ON */}
              {settings.registrationEnabled && (
                <div style={{
                  marginTop: 10, padding: '14px 14px', borderRadius: 10,
                  background: '#f0fdf4', border: '1px dashed #86efac', display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    📅 Registration Window (optional)
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Leave empty for 24/7 open registration, or set a time window to auto-close outside these hours.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={lbl}>OPEN FROM</label>
                      <input type="datetime-local" value={regStartTime}
                        onChange={e => setRegStartTime(e.target.value)}
                        style={{ ...inp, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={lbl}>CLOSE AT</label>
                      <input type="datetime-local" value={regEndTime}
                        onChange={e => setRegEndTime(e.target.value)}
                        style={{ ...inp, fontSize: 12 }} />
                    </div>
                  </div>
                  {!regStartTime && !regEndTime && (
                    <div style={{
                      fontSize: 11, color: '#16a34a', fontWeight: 600,
                      background: '#dcfce7', padding: '8px 10px', borderRadius: 8
                    }}>
                      ∞ 24/7 open — no time restrictions
                    </div>
                  )}
                  {regStartTime && regEndTime && (
                    <div style={{
                      fontSize: 11, color: '#15803d', fontWeight: 600,
                      background: '#dcfce7', padding: '8px 10px', borderRadius: 8
                    }}>
                      ✓ Open: {new Date(regStartTime).toLocaleString()} → {new Date(regEndTime).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Telegram */}
            <div>
              <label style={lbl}>TELEGRAM SUPPORT</label>
              <input value={settings.telegramSupport} onChange={e => update('telegramSupport', e.target.value)}
                style={inp} placeholder="@bittxsmssupport" />
            </div>
          </div>
        </div>

        {/* OTP Pricing */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <SH icon={<DollarSign size={15} />} title="OTP Pricing & Earnings" color="#22c55e" />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '9px 12px', border: '1px solid #bbf7d0', fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
              User earns per OTP. Agent earns % of that. Adjust to control earnings split.
            </div>
            <div>
              <label style={lbl}>USER EARNS PER OTP ($)</label>
              <input type="number" value={otpUserRate} onChange={e => setOtpUserRate(parseFloat(e.target.value) || 0.005)}
                step="0.001" style={inp} />
            </div>
            <div>
              <label style={lbl}>AGENT COMMISSION (% of user earnings)</label>
              <input type="number" value={otpAgentComm} onChange={e => setOtpAgentComm(parseFloat(e.target.value) || 15)}
                min="0" max="100" style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#eff6ff', borderRadius: 9, padding: '10px 12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 3px' }}>User / OTP</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#2563eb', margin: 0 }}>${userNet.toFixed(4)}</p>
              </div>
              <div style={{ background: '#faf5ff', borderRadius: 9, padding: '10px 12px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 3px' }}>Agent / OTP</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', margin: 0 }}>${agentEarn.toFixed(4)}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              1,000 OTPs → User: <strong>${(userNet * 1000).toFixed(2)}</strong> · Agent: <strong>${(agentEarn * 1000).toFixed(2)}</strong>
            </p>
          </div>
        </div>

        {/* OTP & API */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <SH icon={<Activity size={15} />} title="OTP & API Settings" color="#f59e0b" />
          <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>MAX DAILY OTPs / USER</label>
              <div style={{
                padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f0fdf4', fontSize: 13, fontWeight: 700, color: '#16a34a',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                ∞ Unlimited
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                Users with active API access have no daily OTP cap
              </p>
            </div>
            <div>
              <label style={lbl}>API RATE LIMIT</label>
              <div style={{
                padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f0fdf4', fontSize: 13, fontWeight: 700, color: '#16a34a',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                ∞ Continuous
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                No per-minute throttle — requests process continuously
              </p>
            </div>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{
              background: '#eff6ff', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #bfdbfe', fontSize: 11, color: '#1e40af', lineHeight: 1.6
            }}>
              <strong>Access control:</strong> API access is granted per user by the admin.
              Users with access enabled can make unlimited requests.
              Users without access get a <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>403 Forbidden</code> response.
            </div>
          </div>
        </div>

        {/* Security */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <SH icon={<Shield size={15} />} title="Security & Access" color="#6366f1" />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { k: 'apiAccessDefault' as const, label: 'API Access by Default', desc: 'New users get API access automatically' },
              { k: 'twoFactor' as const, label: 'Two-Factor Auth', desc: 'Require 2FA for admin login' },
              { k: 'ipWhitelist' as const, label: 'IP Whitelist', desc: 'Restrict admin access by IP' },
            ]).map(item => (
              <div key={item.k} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                borderRadius: 9, border: `1px solid ${security[item.k] ? '#e0e7ff' : '#e2e8f0'}`,
                background: security[item.k] ? '#f5f3ff' : '#fff', transition: 'all 0.15s'
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>{item.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: security[item.k] ? '#6366f1' : '#94a3b8' }}>
                    {security[item.k] ? 'ON' : 'OFF'}
                  </span>
                  <Toggle val={security[item.k]} fn={() => setSecurity(p => ({ ...p, [item.k]: !p[item.k] }))} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <SH icon={<Bell size={15} />} title="Notifications" color="#0ea5e9" />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { k: 'newWithdrawal' as const, label: 'New Withdrawal Alert', desc: 'Notify when user requests withdrawal' },
              { k: 'newRegistration' as const, label: 'New User Registration', desc: 'Notify on new signups' },
              { k: 'lowBalance' as const, label: 'Low Balance Warning', desc: 'Alert when user balance drops low' },
              { k: 'supportTicket' as const, label: 'Support Ticket Alert', desc: 'Notify on new support ticket' },
            ]).map(item => (
              <div key={item.k} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                borderRadius: 9, border: `1px solid ${notifs[item.k] ? '#e0f2fe' : '#e2e8f0'}`,
                background: notifs[item.k] ? '#f0f9ff' : '#fff', transition: 'all 0.15s'
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>{item.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: notifs[item.k] ? '#0ea5e9' : '#94a3b8' }}>
                    {notifs[item.k] ? 'ON' : 'OFF'}
                  </span>
                  <Toggle val={notifs[item.k]} fn={() => setNotifs(p => ({ ...p, [item.k]: !p[item.k] }))} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ background: '#fff5f5', borderRadius: 14, border: '2px solid #fecaca', overflow: 'hidden' }}>
          <SH icon={<AlertTriangle size={15} />} title="Danger Zone" color="#ef4444" />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { k: 'clear_otps', label: 'Clear All OTP Logs', desc: 'Delete all OTP records permanently' },
              { k: 'reset_balance', label: 'Reset All Balances', desc: 'Set all user balances to $0.00' },
              { k: 'disable_api', label: 'Disable All API Keys', desc: 'Revoke all user API access instantly' },
              { k: 'delete_users', label: 'Delete Inactive Users', desc: 'Remove users with no activity in 30 days' },
            ] as const).map(a => (
              <div key={a.k}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                  borderRadius: 9, background: '#fff', border: '1px solid #fecaca'
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', margin: 0 }}>{a.label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>{a.desc}</p>
                  </div>
                  {dangerDone === a.k ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#dcfce7', color: '#16a34a' }}>✓ Done</span>
                  ) : dangerLoading === a.k ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#fef3c7', color: '#b45309' }}>Processing...</span>
                  ) : dangerConfirm === a.k ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => setDangerConfirm(null)}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={async () => {
                        setDangerLoading(a.k); setDangerConfirm(null)
                        try {
                          if (a.k === 'clear_otps') {
                            await api.delete('/admin/otps/purge')
                          } else if (a.k === 'reset_balance') {
                            await api.post('/admin/reset-balances', {})
                          } else if (a.k === 'disable_api') {
                            await api.post('/admin/disable-api-keys', {})
                          } else if (a.k === 'delete_users') {
                            await api.delete('/admin/inactive-users')
                          }
                          setDangerDone(a.k); setTimeout(() => setDangerDone(null), 3000)
                          flash('Action completed successfully!')
                        } catch (e: any) {
                          flash('Action failed: ' + (e.message || 'Unknown error'))
                        } finally { setDangerLoading(null) }
                      }}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>Confirm</button>
                    </div>
                  ) : (
                    <button onClick={() => setDangerConfirm(a.k)}
                      style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>Execute</button>
                  )}
                </div>
                {dangerConfirm === a.k && (
                  <div style={{
                    padding: '8px 12px', background: '#fff7f7', borderRadius: '0 0 9px 9px',
                    border: '1px solid #fecaca', borderTop: 'none', fontSize: 11, color: '#dc2626', fontWeight: 600
                  }}>
                    ⚠️ This action cannot be undone. Click Confirm to proceed.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>{/* end 2-col grid */}

      {/* ── AI Integration (full width) ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={15} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>AI Integration</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>AI handles support chat — escalates urgent issues to human</span>
          </div>
          <button onClick={() => setShowAiAdd(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: showAiAdd ? '#ede9fe' : '#7c3aed', color: showAiAdd ? '#7c3aed' : '#fff',
              border: showAiAdd ? '1px solid #ddd6fe' : 'none', cursor: 'pointer'
            }}>
            {showAiAdd ? 'Cancel' : '+ Add AI Provider'}
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 20px', background: '#faf5ff', borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#6d28d9', lineHeight: 1.7 }}>
          <strong>How it works:</strong> AI responds in English by default. If user sets language to Bengali — all responses auto-translate.
          For urgent/complex issues, AI says: <em>"Please wait, a support agent will be with you shortly."</em> and escalates to human support.
        </div>

        {/* Add form */}
        {showAiAdd && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            {/* Provider pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 12 }}>
              {AI_PROVIDERS.map(p => (
                <button key={p.key} onClick={() => {
                  setNewAi(prev => ({ ...prev, provider: p.key, model: p.models[0], baseUrl: prev.baseUrl }))
                  setFetchedModels([])
                  setModelFetchErr('')
                  // Re-fetch if API key already entered
                  if (newAi.apiKey.length >= 10) {
                    setTimeout(() => fetchModels(p.key, newAi.apiKey), 100)
                  }
                }}
                  style={{
                    padding: '8px 4px', borderRadius: 8, border: `2px solid ${newAi.provider === p.key ? p.color : '#e2e8f0'}`,
                    background: newAi.provider === p.key ? p.color + '15' : '#fff', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                  }}>
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: newAi.provider === p.key ? p.color : '#64748b', textAlign: 'center' }}>{p.label}</span>
                </button>
              ))}
            </div>
            {/* Doc hint */}
            <div style={{ background: '#eff6ff', borderRadius: 7, padding: '7px 10px', border: '1px solid #bfdbfe', marginBottom: 10, fontSize: 11, color: '#1e40af' }}>
              🔑 {AI_PROVIDERS.find(p => p.key === newAi.provider)?.doc}
            </div>
            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>DISPLAY NAME *</label>
                <input value={newAi.name} onChange={e => setNewAi(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Support AI" style={inp} />
              </div>
              <div>
                <label style={lbl}>API KEY *</label>
                <input
                  type="password"
                  value={newAi.apiKey}
                  onChange={e => {
                    const key = e.target.value
                    setNewAi(p => ({ ...p, apiKey: key }))
                    clearTimeout((window as any)._modelFetchTimer)
                      ; (window as any)._modelFetchTimer = setTimeout(() => {
                        fetchModels(newAi.provider, key)
                      }, 800)
                  }}
                  placeholder="sk-..."
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>BASE URL {newAi.provider === 'custom' ? '*' : '(optional)'}</label>
                <input
                  value={newAi.baseUrl}
                  onChange={e => setNewAi(p => ({ ...p, baseUrl: e.target.value }))}
                  placeholder={newAi.provider === 'custom' ? 'http://localhost:11434/v1' : 'Leave empty for default'}
                  style={inp}
                />
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '3px 0 0' }}>
                  {newAi.provider === 'custom' ? 'Required — e.g. Ollama, LM Studio, or any OpenAI-compatible endpoint' : 'Only needed for custom/self-hosted endpoints'}
                </p>
              </div>
              <div>
                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <span>MODEL {newAi.provider === 'custom' ? '(type manually)' : ''}</span>
                  {fetchingModels && (
                    <span style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700 }}>⟳ Fetching...</span>
                  )}
                  {!fetchingModels && fetchedModels.length > 0 && (
                    <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✓ {fetchedModels.length} models</span>
                  )}
                </label>
                {newAi.provider === 'custom' ? (
                  <input
                    value={newAi.model}
                    onChange={e => setNewAi(p => ({ ...p, model: e.target.value }))}
                    placeholder="e.g. llama3, mistral, gpt-3.5-turbo"
                    style={inp}
                  />
                ) : (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={newAi.model}
                      onChange={e => setNewAi(p => ({ ...p, model: e.target.value }))}
                      disabled={fetchingModels}
                      style={{
                        ...inp, cursor: fetchingModels ? 'wait' : 'pointer', appearance: 'none',
                        paddingRight: 28, opacity: fetchingModels ? 0.6 : 1,
                        background: fetchedModels.length > 0 ? '#f0fdf4' : '#f8fafc',
                        borderColor: fetchedModels.length > 0 ? '#86efac' : '#e2e8f0',
                      }}>
                      {(fetchedModels.length > 0 ? fetchedModels : AI_PROVIDERS.find(p => p.key === newAi.provider)?.models ?? [])
                        .map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <span style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, color: '#94a3b8', pointerEvents: 'none'
                    }}>▼</span>
                  </div>
                )}
                {modelFetchErr && (
                  <p style={{ fontSize: 9, color: '#f59e0b', margin: '3px 0 0', fontWeight: 600 }}>
                    {modelFetchErr} — showing default list
                  </p>
                )}
              </div>
            </div>
            {/* Use cases */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>USE FOR</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AI_USE_CASES.map(uc => {
                  const active = newAi.useFor.includes(uc)
                  return (
                    <button key={uc} onClick={() => setNewAi(p => ({ ...p, useFor: active ? p.useFor.filter(x => x !== uc) : [...p.useFor, uc] }))}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${active ? '#7c3aed' : '#e2e8f0'}`,
                        background: active ? '#f3e8ff' : '#fff', color: active ? '#7c3aed' : '#64748b'
                      }}>
                      {active ? '✓ ' : ''}{uc}
                    </button>
                  )
                })}
              </div>
            </div>
            <button onClick={addAi} disabled={!newAi.name || !newAi.apiKey || (newAi.provider === 'custom' && !newAi.baseUrl)}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: (!newAi.name || !newAi.apiKey || (newAi.provider === 'custom' && !newAi.baseUrl)) ? '#e2e8f0' : '#7c3aed',
                color: (!newAi.name || !newAi.apiKey || (newAi.provider === 'custom' && !newAi.baseUrl)) ? '#94a3b8' : '#fff', border: 'none', cursor: 'pointer'
              }}>
              Add AI Provider
            </button>
          </div>
        )}

        {/* List */}
        <div style={{ padding: '14px 20px' }}>
          {aiProviders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <Bot size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No AI providers connected</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Add an AI to automate support chat & user assistance</p>
            </div>
          ) : aiProviders.map(ai => {
            const meta = AI_PROVIDERS.find(p => p.key === ai.provider)
            return (
              <div key={ai.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 10, marginBottom: 8, border: `1px solid ${ai.enabled ? '#e9d5ff' : '#e2e8f0'}`,
                background: ai.enabled ? '#faf5ff' : '#fafafa'
              }}>
                <span style={{ fontSize: 22 }}>{meta?.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{ai.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: `${meta?.color}15`, color: meta?.color, fontWeight: 600 }}>{meta?.label}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#e0e7ff', color: '#4f46e5', fontFamily: 'monospace' }}>{ai.model}</span>
                    {ai.baseUrl && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontFamily: 'monospace' }}>{ai.baseUrl.slice(0, 30)}{ai.baseUrl.length > 30 ? '...' : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Key:</span>
                    <code style={{ fontSize: 10, color: '#64748b' }}>
                      {showAiKeys[ai.id] ? ai.apiKey : ai.apiKey.slice(0, 6) + '•••••' + ai.apiKey.slice(-4)}
                    </code>
                    <button onClick={() => setShowAiKeys(p => ({ ...p, [ai.id]: !p[ai.id] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '1px' }}>
                      {showAiKeys[ai.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {ai.useFor.map(u => <span key={u} style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed' }}>{u}</span>)}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: ai.enabled ? '#16a34a' : '#94a3b8' }}>{ai.enabled ? 'Active' : 'Inactive'}</span>
                <Toggle val={ai.enabled} fn={() => setAiProviders(p => p.map(x => x.id === ai.id ? { ...x, enabled: !x.enabled } : x))} />
                <button onClick={() => setAiProviders(p => p.filter(x => x.id !== ai.id))}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: '1px solid #fee2e2', background: '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444'
                  }}>
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Email Configuration (full width) ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={15} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Email Configuration</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Gmail SMTP — used for verification & password reset emails</span>
          </div>
          {gmailUser && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Check size={10} /> Configured
            </span>
          )}
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Gmail address */}
            <div>
              <label style={lbl}>GMAIL ADDRESS *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} style={{
                  position: 'absolute', left: 10, top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8'
                }} />
                <input
                  type="email"
                  value={gmailUser}
                  onChange={e => setGmailUser(e.target.value)}
                  placeholder="yourgmail@gmail.com"
                  style={{ ...inp, paddingLeft: 30 }}
                />
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
                Emails will be sent FROM this address
              </p>
            </div>

            {/* App Password */}
            <div>
              <label style={lbl}>GMAIL APP PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showGmailPass ? 'text' : 'password'}
                  value={gmailAppPass}
                  onChange={e => setGmailAppPass(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  style={{ ...inp, paddingRight: 36, fontFamily: gmailAppPass && !showGmailPass ? 'monospace' : undefined }}
                />
                <button type="button" onClick={() => setShowGmailPass(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2
                  }}>
                  {showGmailPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
                16-char App Password (NOT your Gmail login password)
              </p>
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={saveEmailConfig} disabled={!gmailUser || !gmailAppPass || emailSaving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: emailSaved ? '#22c55e' : (!gmailUser || !gmailAppPass) ? '#e2e8f0' : '#2563eb',
                color: (!gmailUser || !gmailAppPass) ? '#94a3b8' : '#fff',
                transition: 'background 0.2s'
              }}>
              {emailSaving ? (
                <><div style={{
                  width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} /> Saving...</>
              ) : emailSaved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Config</>}
            </button>

            <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 240 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={12} style={{
                  position: 'absolute', left: 9, top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8'
                }} />
                <input type="email" value={emailTestAddr} onChange={e => setEmailTestAddr(e.target.value)}
                  placeholder="Send test email to..."
                  style={{ ...inp, paddingLeft: 27, fontSize: 12 }} />
              </div>
              <button onClick={testEmail} disabled={!emailTestAddr || !gmailUser || emailTesting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                  borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: (!emailTestAddr || !gmailUser) ? '#e2e8f0' : '#f0fdf4',
                  color: (!emailTestAddr || !gmailUser) ? '#94a3b8' : '#16a34a',
                  border: `1px solid ${(!emailTestAddr || !gmailUser) ? '#e2e8f0' : '#86efac'}`,
                  whiteSpace: 'nowrap' as const
                }}>
                {emailTesting
                  ? <><div style={{
                    width: 11, height: 11, border: '2px solid #86efac', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} /> Sending...</>
                  : <><Send size={12} /> Send Test</>
                }
              </button>
            </div>
          </div>

          {emailTestMsg && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              background: emailTestMsg.ok ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${emailTestMsg.ok ? '#86efac' : '#fecaca'}`,
              color: emailTestMsg.ok ? '#16a34a' : '#dc2626',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {emailTestMsg.ok ? <Check size={13} /> : '⚠'} {emailTestMsg.msg}
            </div>
          )}

          {gmailUser && (
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 9,
              background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#64748b'
            }}>
              <strong>📧 Emails sent as:</strong>{' '}
              <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>
                "BITTX SMS" &lt;{gmailUser}&gt;
              </code>
              <span style={{ marginLeft: 8, color: '#94a3b8' }}>· Registration verification & Password reset</span>
            </div>
          )}
        </div>

        {/* ── Email Setup Guide (collapsible) ── */}
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setEmailGuideOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: '#2563eb', fontSize: 13, fontWeight: 600, textAlign: 'left'
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={13} />
              📧 Email Setup Guide — How to configure Gmail App Password
            </span>
            <span style={{
              fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s',
              transform: emailGuideOpen ? 'rotate(180deg)' : 'none', display: 'inline-block'
            }}>▼</span>
          </button>

          {emailGuideOpen && (
            <div style={{ padding: '0 20px 20px', animation: 'fadeSlideIn 0.2s ease' }}>
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: '16px 18px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Lock size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                    How to get Gmail App Password (Required for email sending)
                  </span>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { step: 1, title: 'Enable 2-Step Verification', desc: 'Go to myaccount.google.com → Security → Turn on 2-Step Verification', link: null },
                    { step: 2, title: 'Open App Passwords', desc: 'Go to Google Account → Security → App passwords (visible only after 2FA is enabled)', link: 'https://myaccount.google.com/apppasswords' },
                    { step: 3, title: 'Generate App Password', desc: 'Select app: "Mail" → Select device: "Other" → type "BITTX SMS" → Click Generate', link: null },
                    { step: 4, title: 'Copy the 16-character code', desc: 'Google will show a code like: xxxx xxxx xxxx xxxx — copy this exactly', link: null },
                    { step: 5, title: 'Paste in Email Configuration above', desc: 'Enter your Gmail address and paste the App Password → Save Config', link: null },
                  ].map(s => (
                    <div key={s.step} style={{
                      display: 'flex', gap: 12, padding: '10px 12px',
                      background: '#fff', borderRadius: 9, border: '1px solid #dbeafe'
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontSize: 11, fontWeight: 800, color: '#fff'
                      }}>{s.step}</div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>{s.title}</p>
                        <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                        {s.link && (
                          <a href={s.link} target="_blank" rel="noreferrer"
                            style={{
                              fontSize: 11, color: '#2563eb', fontWeight: 700, textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4
                            }}>
                            <ExternalLink size={9} /> Open App Passwords Page →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Important note */}
                <div style={{
                  marginTop: 12, padding: '10px 12px', borderRadius: 8,
                  background: '#fef9c3', border: '1px solid #fde68a'
                }}>
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0, fontWeight: 600 }}>
                    ⚠️ Important: Use the App Password (16 chars), NOT your regular Gmail login password.
                    App Passwords are only available when 2-Step Verification is enabled.
                  </p>
                </div>

                {/* Quick copy example */}
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>📋 server/.env file format:</p>
                  <code style={{ fontSize: 11, color: '#1e293b', fontFamily: 'monospace', lineHeight: 1.8, display: 'block' }}>
                    GMAIL_USER=yourgmail@gmail.com<br />
                    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Database Connections (full width) ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={15} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Database Connections</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Connect from Admin Panel — no code editing needed</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refreshDb} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
              <RefreshCw size={10} /> Refresh
            </button>
            <button onClick={() => { setShowDbAdd(v => !v); setDbTestMsg(null) }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: showDbAdd ? '#ede9fe' : '#7c3aed', color: showDbAdd ? '#7c3aed' : '#fff',
                border: showDbAdd ? '1px solid #ddd6fe' : 'none', cursor: 'pointer'
              }}>
              {showDbAdd ? 'Cancel' : '+ Add Database'}
            </button>
          </div>
        </div>

        {/* Primary status */}
        {dbStatus?.primary && (
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid #f1f5f9',
            background: dbStatus.primary.state === 'connected' ? '#f0fdf4' : '#fff7f7',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span>🍃</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Primary MongoDB</span>
            {dbStatus.primary.uri && <code style={{ fontSize: 10, color: '#64748b', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dbStatus.primary.uri}</code>}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: dbStatus.primary.state === 'connected' ? '#dcfce7' : '#fee2e2',
              color: dbStatus.primary.state === 'connected' ? '#16a34a' : '#dc2626',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {dbStatus.primary.state === 'connected' ? <><Wifi size={9} /> Connected</> : <><WifiOff size={9} /> {dbStatus.primary.state}</>}
            </span>
            {/* Action buttons for primary */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button onClick={() => {
                // Populate the add form with current primary config for editing
                const uri = dbStatus.primary.uri || ''
                const match = uri.match(/mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)\/(\w+)/)
                if (match) {
                  setNewDb({ id: 'primary', type: 'mongodb', label: 'Primary MongoDB', host: match[2], port: '27017', name: match[3], user: match[1], pass: '', connected: true })
                  setShowDbAdd(true)
                }
              }}
                title="Edit Primary"
                style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => setConfirmDisconnectPrimary(true)}
                title="Disconnect Primary"
                style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Power size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Add form */}
        {showDbAdd && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {newDb.id ? '✏️ Edit Connection' : '➕ Add Database'}
              </span>
              {newDb.id && (
                <button onClick={() => { setShowDbAdd(false); setNewDb({ id: '', type: 'mongodb', label: 'MongoDB', host: '', port: '27017', name: 'bittxsms', user: '', pass: '', connected: false }); setDbUri(''); setDbInputMode('form') }}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  Cancel Edit
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginBottom: 10 }}>
              {DB_TYPES.map(db => (
                <button key={db.type} onClick={() => setNewDb(p => ({ ...p, type: db.type, label: db.label, port: db.port }))}
                  style={{
                    padding: '8px 4px', borderRadius: 8, border: `2px solid ${newDb.type === db.type ? db.color : '#e2e8f0'}`,
                    background: newDb.type === db.type ? db.color + '15' : '#fff', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                  }}>
                  <span style={{ fontSize: 18 }}>{db.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: newDb.type === db.type ? db.color : '#64748b', textAlign: 'center' }}>{db.label}</span>
                </button>
              ))}
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 7, padding: '7px 10px', border: '1px solid #bfdbfe', marginBottom: 10, fontSize: 11, color: '#1e40af' }}>
              📖 {DB_TYPES.find(d => d.type === newDb.type)?.doc}
            </div>

            {/* Firebase-specific fields */}
            {newDb.type === 'firebase' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa', fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                  <strong>🔥 Firebase Setup:</strong> Go to{' '}
                  <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"
                    style={{ color: '#f59e0b', fontWeight: 700 }}>console.firebase.google.com</a>
                  {' '}→ Your Project → Project Settings → Service Accounts → Generate new private key
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>PROJECT ID *</label>
                    <input value={newDb.name} onChange={e => setNewDb(p => ({ ...p, name: e.target.value }))}
                      placeholder="your-project-id" style={inp} />
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>
                      Found in Firebase Console → Project Settings
                    </p>
                  </div>
                  <div>
                    <label style={lbl}>DATABASE URL (optional)</label>
                    <input value={newDb.host} onChange={e => setNewDb(p => ({ ...p, host: e.target.value }))}
                      placeholder="https://your-project.firebaseio.com" style={inp} />
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>
                      Only needed for Realtime Database
                    </p>
                  </div>
                </div>
                <div>
                  <label style={lbl}>SERVICE ACCOUNT PRIVATE KEY (JSON) *</label>
                  <textarea value={newDb.pass} onChange={e => setNewDb(p => ({ ...p, pass: e.target.value }))}
                    rows={5} placeholder={'{\n  "type": "service_account",\n  "project_id": "your-project-id",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",\n  "client_email": "firebase-adminsdk@your-project.iam.gserviceaccount.com",\n  ...\n}'}
                    style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }} />
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>
                    Paste the entire JSON content from the downloaded service account key file
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={testDb} disabled={dbTesting || !newDb.name}
                    style={{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: '1px solid #f59e0b', background: '#fff7ed', color: '#f59e0b', cursor: 'pointer' }}>
                    {dbTesting ? '⟳ Testing...' : '⚡ Test Connection'}
                  </button>
                  <button onClick={addDb} disabled={!newDb.name || !newDb.pass}
                    style={{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    🔥 Save Firebase
                  </button>
                </div>
              </div>
            )}

            {/* Supabase-specific fields */}
            {newDb.type === 'supabase' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 12px', border: '1px solid #6ee7b7', fontSize: 11, color: '#065f46', lineHeight: 1.6 }}>
                  <strong>💚 Supabase Setup:</strong> Go to{' '}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                    style={{ color: '#10b981', fontWeight: 700 }}>supabase.com/dashboard</a>
                  {' '}→ Your Project → Settings → API → copy Project URL & anon/service_role key
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>PROJECT URL *</label>
                    <input value={newDb.host} onChange={e => setNewDb(p => ({ ...p, host: e.target.value }))}
                      placeholder="https://xxxx.supabase.co" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>ANON / SERVICE ROLE KEY *</label>
                    <input type="password" value={newDb.pass} onChange={e => setNewDb(p => ({ ...p, pass: e.target.value }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={testDb} disabled={dbTesting || !newDb.host}
                    style={{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: '1px solid #10b981', background: '#ecfdf5', color: '#10b981', cursor: 'pointer' }}>
                    {dbTesting ? '⟳ Testing...' : '⚡ Test Connection'}
                  </button>
                  <button onClick={addDb} disabled={!newDb.host || !newDb.pass}
                    style={{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    💚 Save Supabase
                  </button>
                </div>
              </div>
            )}

            {/* Standard DB fields (MongoDB, MySQL, PostgreSQL, Redis) */}
            {newDb.type !== 'firebase' && newDb.type !== 'supabase' && (
              <>
                {/* URI/Form toggle for MongoDB */}
                {newDb.type === 'mongodb' && (
                  <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', background: '#1e293b', borderRadius: 7, padding: 3 }}>
                      <button onClick={() => { setDbInputMode('form'); setDbUri('') }}
                        style={{ padding: '5px 14px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: dbInputMode === 'form' ? '#3b82f6' : 'transparent', color: dbInputMode === 'form' ? '#fff' : '#94a3b8' }}>
                        📋 Form
                      </button>
                      <button onClick={() => setDbInputMode('uri')}
                        style={{ padding: '5px 14px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: dbInputMode === 'uri' ? '#3b82f6' : 'transparent', color: dbInputMode === 'uri' ? '#fff' : '#94a3b8' }}>
                        🔗 Connection String
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {dbInputMode === 'form' ? 'Fill in each field manually' : 'Paste the full MongoDB URI'}
                    </span>
                  </div>
                )}

                {/* URI input mode */}
                {newDb.type === 'mongodb' && dbInputMode === 'uri' && (() => {
                  const uriValid = /^mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^:/]+(?::\d+)?(?:\/[^?]*)?(\?.+)?$/i.test(dbUri)
                  return (
                    <div style={{ marginBottom: 10 }}>
                      <label style={lbl}>MONGODB CONNECTION STRING</label>
                      <input
                        value={dbUri}
                        onChange={e => {
                          const uri = e.target.value
                          setDbUri(uri)
                          try {
                            const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?(?:\/([^?]*))?(?:\?.+)?$/i)
                            if (match) {
                              const [, user, pass, host, port, dbName] = match
                              setNewDb(p => ({ ...p, user, pass, host, port: port || '27017', name: dbName || 'bittxsms' }))
                            }
                          } catch {}
                        }}
                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net/bittxsms?retryWrites=true&w=majority"
                        style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }}
                      />
                      {dbUri && (
                        <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, background: uriValid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${uriValid ? '#bbf7d0' : '#fecaca'}`, fontSize: 11, color: uriValid ? '#166534' : '#991b1b' }}>
                          {uriValid ? `✓ Parsed → Host: ${newDb.host} | Port: ${newDb.port} | DB: ${newDb.name}` : '⚠ Invalid URI — expected: mongodb+srv://user:pass@host/db or mongodb+srv://user:pass@host'}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Standard form fields */}
                {dbInputMode === 'form' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>{newDb.type === 'mongodb' ? 'CLUSTER HOST' : 'HOST / URL'}</label>
                  <input value={newDb.host} onChange={e => setNewDb(p => ({ ...p, host: e.target.value }))}
                    placeholder={newDb.type === 'mongodb' ? 'cluster0.abc.mongodb.net' : 'localhost'} style={inp} />
                </div>
                <div>
                  <label style={lbl}>PORT</label>
                  <input value={newDb.port} onChange={e => setNewDb(p => ({ ...p, port: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>DATABASE NAME</label>
                  <input value={newDb.name} onChange={e => setNewDb(p => ({ ...p, name: e.target.value }))} placeholder="bittxsms" style={inp} />
                </div>
                <div>
                  <label style={lbl}>{newDb.type === 'redis' ? 'USERNAME (optional)' : 'USERNAME'}</label>
                  <input value={newDb.user} onChange={e => setNewDb(p => ({ ...p, user: e.target.value }))}
                    placeholder={newDb.type === 'mongodb' ? 'dbuser' : 'admin'} style={inp} />
                </div>
                <div>
                  <label style={lbl}>PASSWORD</label>
                  <input type="password" value={newDb.pass} onChange={e => setNewDb(p => ({ ...p, pass: e.target.value }))} placeholder="••••••••" style={inp} />
                </div>
              </div>
                )}

                {/* Auto-Setup & Smart Sync — shown for BOTH modes */}
                <div style={{ display: 'flex', gap: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#166534' }}>
                    <input type="checkbox" checked={dbAutoSetup} onChange={e => setDbAutoSetup(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#22c55e' }} />
                    Auto-Setup (create collections & indexes)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#166534' }}>
                    <input type="checkbox" checked={dbSmartSync} onChange={e => setDbSmartSync(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#22c55e' }} />
                    Smart Sync (copy missing data from primary)
                  </label>
                </div>

                {/* Test & Save — shown for BOTH modes */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <button onClick={testDb} disabled={dbTesting || (!newDb.host && !dbUri)}
                    style={{ flex: 1, padding: '8px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: '1px solid #6366f1', background: '#fff', color: '#6366f1', cursor: 'pointer' }}>
                    {dbTesting ? '⟳ Testing...' : '⚡ Test Connection'}
                  </button>
                  <button onClick={addDb} disabled={!newDb.host && !dbUri}
                    style={{ flex: 1, padding: '8px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Save
                  </button>
                </div>
              </>
            )}
            {dbTestMsg && (
              <div style={{
                padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                background: dbTestMsg.ok ? '#dcfce7' : '#fee2e2', color: dbTestMsg.ok ? '#16a34a' : '#dc2626',
                border: `1px solid ${dbTestMsg.ok ? '#86efac' : '#fca5a5'}`
              }}>
                {dbTestMsg.ok ? '✓ ' : '✗ '}{dbTestMsg.msg}
              </div>
            )}
          </div>
        )}

        {/* DB list */}
        <div style={{ padding: '14px 20px' }}>
          {dbConfigs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <Database size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                {dbStatus?.primary?.state === 'connected' ? 'Primary MongoDB is connected ✓' : 'No databases configured'}
              </p>
            </div>
          ) : dbConfigs.map(db => {
            const meta = DB_TYPES.find(d => d.type === db.type)
            const cs = db.type === 'mongodb' ? `mongodb+srv://${db.user}:***@${db.host}/${db.name}` : `${db.type}://${db.user}:***@${db.host}:${db.port}/${db.name}`
            const isViewing = viewDbId === db.id
            return (
              <div key={db.id} style={{
                padding: '12px 14px', borderRadius: 10,
                marginBottom: 8, border: `1px solid ${(meta?.color ?? '#e2e8f0')}30`, background: `${(meta?.color ?? '#f8fafc')}06`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta?.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{db.label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <code style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{cs}</code>
                      <CopyBtn text={cs} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: db.connected ? '#dcfce7' : '#fef9c3', color: db.connected ? '#16a34a' : '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {db.connected ? <><Wifi size={9} /> Connected</> : 'Pending'}
                  </span>
                  {/* View details */}
                  <button onClick={() => setViewDbId(isViewing ? null : db.id)}
                    title="View Details"
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', background: isViewing ? '#eff6ff' : '#fff', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={12} />
                  </button>
                  {/* Edit */}
                  <button onClick={() => {
                    setNewDb({ ...db, pass: '' })
                    if ((db as any).uri) {
                      setDbInputMode('uri')
                      setDbUri((db as any).uri)
                    } else {
                      setDbInputMode('form')
                      setDbUri('')
                    }
                    setShowDbAdd(true)
                  }}
                    title="Edit Connection"
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit2 size={12} />
                  </button>
                  {/* Delete */}
                  <button onClick={() => setConfirmDeleteDbId(db.id)}
                    title="Delete Database"
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* Action buttons row for connected DBs */}
                {db.connected && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={async () => {
                      try {
                        const r = await api.post(`/database/${db.id}/setup`, {})
                        flash(`✓ Setup: ${r.result?.created?.length || 0} collections created, ${r.result?.indexes?.length || 0} indexes`)
                      } catch (e: any) { flash('Setup failed: ' + e.message) }
                    }}
                      style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Database size={11} /> Auto Setup
                    </button>
                    <button onClick={async () => {
                      try {
                        const r = await api.post(`/database/${db.id}/sync`, {})
                        const synced = r.result?.synced?.reduce((a: number, s: any) => a + s.count, 0) || 0
                        flash(`✓ Sync: ${synced} documents copied from primary`)
                      } catch (e: any) { flash('Sync failed: ' + e.message) }
                    }}
                      style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={11} /> Smart Sync
                    </button>
                  </div>
                )}
                {/* View details panel */}
                {isViewing && (
                  <div style={{ marginTop: 12, padding: '14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7c3aed', margin: '0 0 10px' }}>Connection Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>TYPE</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{db.label}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>STATUS</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: db.connected ? '#16a34a' : '#b45309', margin: 0 }}>{db.connected ? 'Connected' : 'Pending'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>HOST</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, wordBreak: 'break-all' }}>{db.host || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>PORT</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{db.port || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>DATABASE NAME</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{db.name || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>USERNAME</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{db.user || '—'}</p>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px' }}>CONNECTION STRING</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', wordBreak: 'break-all', flex: 1 }}>{cs}</code>
                          <CopyBtn text={cs} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Guide */}
        <div style={{ padding: '0 20px 16px' }}>
          <details style={{ background: '#f8fafc', borderRadius: 9, border: '1px solid #e2e8f0' }}>
            <summary style={{
              padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569',
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <ExternalLink size={12} /> Database Setup Guide
            </summary>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #f1f5f9' }}>
              {DB_TYPES.map(db => (
                <div key={db.type}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: db.color, margin: '0 0 2px' }}>{db.icon} {db.label}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{db.doc}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ── Landing Page Customization ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={15} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Landing Page Customization</h3>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Edit homepage content — changes apply after saving</span>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Hero Text */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: '#6366f1' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Hero Section</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>BADGE TEXT</label>
                <input value={landingBadge} onChange={e => setLandingBadge(e.target.value)}
                  placeholder="REAL-TIME OTP PLATFORM" style={inp} />
              </div>
              <div>
                <label style={lbl}>PRIMARY BUTTON TEXT</label>
                <input value={landingCtaPrimary} onChange={e => setLandingCtaPrimary(e.target.value)}
                  placeholder="Start Free Now" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>HEADLINE</label>
              <input value={landingHero.headline} onChange={e => setLandingHero(p => ({ ...p, headline: e.target.value }))}
                placeholder="Virtual Numbers for Instant OTP Verification" style={inp} />
            </div>
            <div>
              <label style={lbl}>SUBTEXT / DESCRIPTION</label>
              <textarea value={landingHero.subtext} onChange={e => setLandingHero(p => ({ ...p, subtext: e.target.value }))}
                rows={2} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6, fontFamily: 'inherit' }}
                placeholder="Rent temporary phone numbers, monitor SMS codes in real-time..." />
            </div>
          </div>

          {/* Stats */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: '#22d3ee' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Stats Numbers</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Animated counters on homepage</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {landingStats.map((stat, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input type="number" value={stat.value}
                      onChange={e => setLandingStats(p => p.map((s, j) => j === i ? { ...s, value: Number(e.target.value) } : s))}
                      style={{ ...inp, width: '60%', padding: '6px 10px' }} />
                    <input value={stat.suffix}
                      onChange={e => setLandingStats(p => p.map((s, j) => j === i ? { ...s, suffix: e.target.value } : s))}
                      placeholder="+" style={{ ...inp, width: '40%', padding: '6px 10px', textAlign: 'center' as const }} />
                  </div>
                  <input value={stat.label}
                    onChange={e => setLandingStats(p => p.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                    style={{ ...inp, padding: '5px 10px', fontSize: 11 }} placeholder="Label" />
                  <div style={{ marginTop: 8, textAlign: 'center' as const, padding: '6px', background: '#fff', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{stat.value.toLocaleString()}{stat.suffix}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Visibility */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: '#34d399' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Section Visibility</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Services Marquee', sublabel: 'Telegram, WhatsApp, etc. scrolling section', val: landingServicesVisible, fn: () => setLandingServicesVisible(v => !v) },
                { label: 'Testimonials Section', sublabel: 'User reviews scrolling marquee', val: landingTestimonialsVisible, fn: () => setLandingTestimonialsVisible(v => !v) },
              ].map(({ label, sublabel, val, fn }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${val ? '#d1fae5' : '#e2e8f0'}`,
                  background: val ? '#f0fdf4' : '#f8fafc',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{sublabel}</p>
                  </div>
                  <Toggle val={val} fn={fn} />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{ background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <p style={{ fontSize: 12, color: '#4c1d95', margin: 0, lineHeight: 1.6 }}>
              <strong>Live Preview:</strong> Click <strong>Save Settings</strong> at the top, then visit the homepage to see your changes instantly applied.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
