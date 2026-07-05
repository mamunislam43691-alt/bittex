import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LanguageCode, getTranslation, Translations } from '../locales/translations'

type Theme = 'light' | 'dark'
type Density = 'comfortable' | 'compact'
type Font = 'Inter' | 'Plus Jakarta Sans' | 'Manrope' | 'Space Grotesk' | 'DM Sans'

const ACCENT_COLORS: Record<string, string> = {
  teal:   '#0D9488',
  purple: '#7C3AED',
  pink:   '#DB2777',
  orange: '#EA580C',
  blue:   '#2563EB',
  yellow: '#CA8A04',
}

const FONT_STACK: Record<Font, string> = {
  'Inter':             "'Inter', system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  'Manrope':           "'Manrope', system-ui, sans-serif",
  'Space Grotesk':     "'Space Grotesk', system-ui, sans-serif",
  'DM Sans':           "'DM Sans', system-ui, sans-serif",
}

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  accentKey: string
  setAccentKey: (k: string) => void
  accentColor: string
  density: Density
  setDensity: (d: Density) => void
  privacyMode: boolean
  setPrivacyMode: (v: boolean) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  alreadyHitEnabled: boolean
  setAlreadyHitEnabled: (v: boolean) => void
  font: Font
  setFont: (f: Font) => void
  tweaksOpen: boolean
  setTweaksOpen: (v: boolean) => void
  username: string
  setUsername: (v: string) => void
  photoUrl: string | null
  setPhotoUrl: (v: string | null) => void
  accentColors: Record<string, string>
  fonts: Font[]
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: Translations
}

const ALL_FONTS: Font[] = ['Plus Jakarta Sans', 'Inter', 'Manrope', 'Space Grotesk', 'DM Sans']
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Default fallback — only used when DB is unreachable on first load.
 * Normal route: fetch from backend, persist to backend on each change.
 */
const DEFAULT_PREFS = {
  theme: 'light', accentKey: 'purple', font: 'Inter',
  density: 'comfortable', language: 'en',
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from system defaults — never from localStorage
  const [theme, setThemeState]                 = useState<Theme>(DEFAULT_PREFS.theme as Theme)
  const [accentKey, setAccentKeyState]         = useState(DEFAULT_PREFS.accentKey)
  const [density, setDensityState]              = useState<Density>('comfortable')
  const [privacyMode, setPrivacyMode]          = useState(false)
  const [alreadyHitEnabled, setAlreadyHitEnabled] = useState(true)
  const [font, setFontState]                   = useState<Font>('Inter')
  const [tweaksOpen, setTweaksOpen]            = useState(false)
  const [username, setUsername]                 = useState('Islam')
  const [photoUrl, setPhotoUrl]                 = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [language, setLanguageState]           = useState<LanguageCode>('en')
  const [translations, setTranslations]         = useState<Translations>(getTranslation('en'))

  const accentColor = ACCENT_COLORS[accentKey] || ACCENT_COLORS.purple

  /* ─── DOM application helpers ─── */
  const applyTheme    = (t: Theme) => { document.documentElement.classList.toggle('dark', t === 'dark') }
  const applyAccent   = (k: string) => { document.documentElement.style.setProperty('--accent', ACCENT_COLORS[k] || ACCENT_COLORS.purple) }
  const applyFont     = (f: Font) => { document.body.style.fontFamily = FONT_STACK[f] }
  const applyLanguage = (lang: LanguageCode) => {
    if (lang === 'ar') { document.documentElement.setAttribute('dir', 'rtl'); document.documentElement.lang = 'ar' }
    else { document.documentElement.setAttribute('dir', 'ltr'); document.documentElement.lang = lang }
  }

  /* ─── Backend sync helper ───
   * Saves to DB. Choice of endpoint depends on whether user is logged in:
   *  - logged-in:  PUT /api/profile/preferences
   *  - anonymous:  PUT /api/profile/public-prefs
   * We always PUSH to DB, never to localStorage.				*/
  const syncToBackend = (overrides: Record<string, any>) => {
    const payload = { theme, accentKey, font, density, language, ...overrides }
    const send = () => {
      try {
        if (localStorage.getItem('bittx_token_user')
            || localStorage.getItem('bittx_token_admin')
            || localStorage.getItem('bittx_token_agent')) {
          // Logged in → per-user prefs
          import('../lib/api').then(({ profileApi }) => {
            profileApi.savePreferences(payload).catch(() => {})
          }).catch(() => {})
        } else {
          // Anonymous → public prefs
          import('../lib/api').then(({ api }) => {
            api.put('/profile/public-prefs', payload).catch(() => {})
          }).catch(() => {})
        }
      } catch {}
    }
    send()
  }

  /* ─── Load prefs from DB ───
   * Called on mount AND after every login event.
   * Source of truth = backend, NO localStorage fallback beyond defaults. */
  const loadPrefsFromDB = () => {
    try {
      // Detect if any token exists for any panel
      const hasToken =
        localStorage.getItem('bittx_token_user')
        || localStorage.getItem('bittx_token_admin')
        || localStorage.getItem('bittx_token_agent')

      const fetcher = hasToken
        ? import('../lib/api').then(({ profileApi }) => profileApi.getPreferences())
        : import('../lib/api').then(({ api }) => api.get('/profile/public-prefs'))

      fetcher.then((res: any) => {
        const p = res?.preferences || {}
        if (p.theme)     { setThemeState(p.theme); applyTheme(p.theme) }
        if (p.accentKey) { setAccentKeyState(p.accentKey); applyAccent(p.accentKey) }
        if (p.font)      { setFontState(p.font); applyFont(p.font) }
        if (p.density)   setDensity(p.density)
        if (p.language)  {
          setLanguageState(p.language)
          setTranslations(getTranslation(p.language))
          applyLanguage(p.language)
        }
        if (typeof p.sidebarCollapsed === 'boolean') setSidebarCollapsed(p.sidebarCollapsed)
      }).catch(() => { /* network failure — keep defaults */ })
    } catch {}
  }

  /* Apply defaults to DOM on first render (before DB load completes) */
  useEffect(() => {
    applyTheme(DEFAULT_PREFS.theme as Theme)
    applyAccent(DEFAULT_PREFS.accentKey)
    applyFont(DEFAULT_PREFS.font as Font)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Load from DB AFTER auth state changes */
  useEffect(() => { loadPrefsFromDB() }, [])

  /* Re-load prefs whenever AuthContext dispatches 'auth:login' (post-login refresh)
   * or 'auth:logout' (fall back to anonymous defaults). */
  useEffect(() => {
    const onLogin  = () => loadPrefsFromDB()
    const onLogout = () => {
      // Reset to system defaults for next visitor
      try { localStorage.removeItem('bittx_token_user') } catch {}
      try { localStorage.removeItem('bittx_token_admin') } catch {}
      try { localStorage.removeItem('bittx_token_agent') } catch {}
      setThemeState(DEFAULT_PREFS.theme as Theme)
      setAccentKeyState(DEFAULT_PREFS.accentKey)
      setFontState(DEFAULT_PREFS.font as Font)
      setDensity('comfortable' as Density)
      setLanguageState('en')
      setTranslations(getTranslation('en'))
      applyTheme(DEFAULT_PREFS.theme as Theme)
      applyAccent(DEFAULT_PREFS.accentKey)
      applyFont(DEFAULT_PREFS.font as Font)
      applyLanguage('en')
    }
    window.addEventListener('auth:login', onLogin)
    window.addEventListener('auth:logout', onLogout)
    return () => {
      window.removeEventListener('auth:login', onLogin)
      window.removeEventListener('auth:logout', onLogout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.classList.toggle('privacy-on', privacyMode)
  }, [privacyMode])

  /* ─── Setters that update BOTH local state AND backend ─── */
  const setTheme = (t: Theme) => { setThemeState(t); applyTheme(t); syncToBackend({ theme: t }) }
  const setAccentKey = (k: string) => { setAccentKeyState(k); applyAccent(k); syncToBackend({ accentKey: k }) }
  const setFont = (f: Font) => { setFontState(f); applyFont(f); syncToBackend({ font: f }) }
  const setDensity = (d: Density) => { setDensityState(d); syncToBackend({ density: d }) }
  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang)
    setTranslations(getTranslation(lang))
    applyLanguage(lang)
    syncToBackend({ language: lang })
  }

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      accentKey, setAccentKey, accentColor,
      density, setDensity,
      privacyMode, setPrivacyMode,
      alreadyHitEnabled, setAlreadyHitEnabled,
      font, setFont,
      tweaksOpen, setTweaksOpen,
      username, setUsername,
      photoUrl, setPhotoUrl,
      sidebarCollapsed, setSidebarCollapsed,
      accentColors: ACCENT_COLORS,
      fonts: ALL_FONTS,
      language, setLanguage,
      t: translations,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
