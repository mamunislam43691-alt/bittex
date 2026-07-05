import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, setActivePanel, getActivePanel, tagForPanel } from '../lib/api'
import { connectSocket, disconnectSocket, onDataUpdated, onBalanceUpdated } from '../lib/socket'

export type UserRole = 'superadmin' | 'admin' | 'agent' | 'user' | 'moderator' | 'support'

export interface AuthUser {
  id: string
  _id?: string
  username: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  country?: string
  role: UserRole
  balance: number
  apiKey?: string
  apiEnabled: boolean
  status: 'active' | 'inactive' | 'pending' | 'banned' | 'suspended'
  joinedAt: string
  lastLogin?: string
  profileComplete?: boolean
  agentId?: string | null
  telegram?: string
  agentEmail?: string
  commission?: number
  totalEarned?: number
  sessions?: any[]
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, panel: 'admin' | 'agent' | 'user', rememberMe?: boolean) => Promise<AuthUser>
  register: (data: RegisterData) => Promise<AuthUser>
  logout: () => void
  refreshUser: () => Promise<void>
  isAdmin: boolean
  isAgent: boolean
  isUser: boolean
  isSuperAdmin: boolean
}

export interface RegisterData {
  username: string
  email: string
  phone: string
  password: string
  agentEmail?: string
  firstName?: string
  lastName?: string
  country?: string
  city?: string
}

/* ── Storage helpers ── */
function keysForRole(role?: string) {
  const tag = ['admin', 'superadmin', 'moderator', 'support'].includes(role || '') ? 'admin'
    : role === 'agent' ? 'agent' : 'user'
  return { token: `bittx_token_${tag}`, session: `bittx_session_${tag}`, expiry: `bittx_expiry_${tag}` }
}

/** Read session from any role-specific key (for external use) */
export function readAnySession(): Record<string, any> {
  for (const tag of ['admin', 'agent', 'user']) {
    try {
      const raw = localStorage.getItem(`bittx_session_${tag}`)
        || sessionStorage.getItem(`bittx_session_${tag}`)
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  try {
    const raw = localStorage.getItem('bittx_session')
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

/** Write session to the correct role-specific key (for external use) */
export function writeSession(data: Record<string, any>) {
  const keys = keysForRole(data.role)
  localStorage.setItem(keys.session, JSON.stringify(data))
}

/** Build a unique-ordered list of tags to check, with active_panel first */
function buildSessionOrder(): Array<'admin' | 'agent' | 'user'> {
  const active = getActivePanel()
  const base: Array<'admin' | 'agent' | 'user'> = ['admin', 'agent', 'user']
  if (!active) return base
  // Move active_panel to the front, preserve other tags after it
  return [active, ...base.filter(t => t !== active)]
}

/** Heuristic: figure out tag from a user's role (used as fallback when active_panel missing) */
function tagFromRole(role: string | undefined): 'admin' | 'agent' | 'user' | null {
  if (!role) return null
  if (['admin','superadmin','moderator','support'].includes(role)) return 'admin'
  if (role === 'agent') return 'agent'
  if (role === 'user') return 'user'
  return null
}

function loadSession(): AuthUser | null {
  const order = buildSessionOrder()
  for (const tag of order) {
    try {
      // Check expiry only if expiry key EXISTS (remember me was on)
      const expiry = localStorage.getItem(`bittx_expiry_${tag}`)
      if (expiry && Date.now() > Number(expiry)) {
        // Expired — clear this tag
        localStorage.removeItem(`bittx_token_${tag}`)
        localStorage.removeItem(`bittx_session_${tag}`)
        localStorage.removeItem(`bittx_expiry_${tag}`)
        continue
      }
      // No expiry = permanent until explicit logout
      const raw = localStorage.getItem(`bittx_session_${tag}`)
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return null
}

function loadToken(): string | null {
  const order = buildSessionOrder()
  for (const tag of order) {
    const t = localStorage.getItem(`bittx_token_${tag}`)
    if (t) return t
  }
  return null
}

function saveSession(user: AuthUser, rememberMe = true) {
  const keys = keysForRole(user.role)
  const data = JSON.stringify(user)
  // Always save to localStorage so reload persists
  localStorage.setItem(keys.session, data)
  if (rememberMe) {
    // 30-day expiry (matches JWT)
    localStorage.setItem(keys.expiry, String(Date.now() + 30 * 24 * 60 * 60 * 1000))
  } else {
    // No expiry = permanent until explicit logout
    localStorage.removeItem(keys.expiry)
  }
  // Clear any legacy sessionStorage
  sessionStorage.removeItem(keys.session)
  sessionStorage.removeItem(keys.token)
}

function clearSession(userRole?: string) {
  const keys = keysForRole(userRole)
  localStorage.removeItem(keys.token)
  localStorage.removeItem(keys.session)
  localStorage.removeItem(keys.expiry)
  // Legacy cleanup
  sessionStorage.removeItem(keys.token)
  sessionStorage.removeItem(keys.session)
  localStorage.removeItem('bittx_token')
  localStorage.removeItem('bittx_session')
  try { localStorage.removeItem('bittx_active_panel') } catch {}
}

/** Normalize a raw API user so `id`, `username`, `firstName`, `lastName` are always set */
function normalizeUser(raw: any): AuthUser {
  const id = raw._id || raw.id || ''
  // Support both username-only and firstName/lastName patterns
  const username = raw.username || raw.firstName || raw.email?.split('@')[0] || 'User'
  return {
    ...raw,
    id,
    _id: id,
    username,
    firstName: raw.firstName || username,
    lastName:  raw.lastName  || '',
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = loadSession()
    const token = loadToken()

    if (!session || !token) {
      // No saved session → go to login
      setLoading(false)
      return
    }

    // If active_panel wasn't set, derive it from session role (best-effort recovery)
    if (!getActivePanel()) {
      const derived = tagFromRole(session.role)
      if (derived) setActivePanel(derived)
    }

    // ── STEP 1: Immediately restore user from cached session so the UI doesn't bounce
    //              to the login page on reload while we verify with the server.
    const cachedUser = normalizeUser(session)
    setUser(cachedUser)
    connectSocket(session._id || session.id, session.role)
    setLoading(false)  // Already done — UI can render with cached user

    // ── STEP 2: Verify with server in background; silently update on success.
    //            Only invalidate on REAL auth errors (HTTP 401/403).
    authApi.me()
      .then(res => {
        if (res?.user) {
          const fresh = normalizeUser(res.user)
          if (fresh.status === 'banned' || fresh.status === 'suspended' || fresh.status === 'inactive') {
            clearSession(fresh.role)
            disconnectSocket()
            setUser(null)
            return
          }
          const tag = ['admin', 'superadmin', 'moderator', 'support'].includes(fresh.role) ? 'admin'
            : fresh.role === 'agent' ? 'agent' : 'user'
          const hasRememberMe = !!localStorage.getItem(`bittx_session_${tag}`)
          saveSession(fresh, hasRememberMe)
          setUser(prev => {
            // Only swap if same identity to avoid flicker if user logged out elsewhere
            if (prev && (prev._id === fresh._id || prev.id === fresh.id)) {
              return fresh
            }
            return prev
          })
        }
      })
      .catch((err) => {
        // Only invalidate on REAL auth errors (HTTP 401/403).
        // Network errors / server hiccups → keep cached user logged in.
        const status = err?.status
        const isAuthError = (status === 401 || status === 403)
        if (isAuthError) {
          clearSession(cachedUser.role)
          disconnectSocket()
          setUser(null)
        }
        // else: network error → cached user stays, page renders normally
      })
  }, [])

  const login = async (email: string, password: string, panel: 'admin' | 'agent' | 'user', rememberMe = false): Promise<AuthUser> => {
    try {
      clearSession(panel === 'admin' ? 'admin' : panel === 'agent' ? 'agent' : 'user')
      setUser(null)

      const response = await authApi.login(email, password)
      const userData = normalizeUser(response.user)

      if (userData.status === 'banned')    throw new Error('Your account has been banned')
      if (userData.status === 'suspended') throw new Error('Your account has been suspended')
      if (userData.status === 'inactive')  throw new Error('Account deactivated. Contact admin.')
      // Pending check only applies to regular users
      if (userData.status === 'pending' && userData.profileComplete === true
          && !['admin','superadmin','moderator','support','agent'].includes(userData.role))
        throw new Error('Account pending activation. Contact your agent.')

      if (panel === 'admin' && !['admin', 'superadmin', 'moderator', 'support'].includes(userData.role)) {
        throw new Error('Access denied: Not an admin account')
      }
      if (panel === 'agent' && userData.role !== 'agent') {
        throw new Error('Access denied: Not an agent account')
      }
      if (panel === 'user' && !['user'].includes(userData.role)) {
        throw new Error('Access denied: Use the correct panel for your account')
      }

      const keys = keysForRole(userData.role)
      // Always save token to localStorage for reload persistence
      // rememberMe controls the 30-day expiry
      localStorage.setItem(keys.token, response.token)
      if (rememberMe) {
        localStorage.setItem(keys.expiry, String(Date.now() + 30 * 24 * 60 * 60 * 1000))
      } else {
        // No expiry = session valid until explicit logout (survives reload/browser close)
        localStorage.removeItem(keys.expiry)
      }
      // Mark this as the active panel so reload picks correct session
      setActivePanel(panel)
      saveSession(userData, rememberMe)
      setUser(userData)
      connectSocket(userData._id || userData.id, userData.role)
      // Refresh user-scoped preferences from DB (theme, accent, language)
      import('./ThemeContext').catch(() => {}).then((m: any) => {
        try { window.dispatchEvent(new CustomEvent('auth:login')) } catch {}
      })
      return userData
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const register = async (data: RegisterData): Promise<AuthUser> => {
    try {
      const response = await authApi.register({
        username:   data.username,
        email:      data.email,
        phone:      data.phone,
        password:   data.password,
        agentEmail: data.agentEmail || undefined,
        firstName:  data.firstName || '',
        lastName:   data.lastName || '',
        country:    data.country || '',
        city:       data.city || '',
      })
      const userData = normalizeUser(response.user)
      const keys = keysForRole(userData.role)
      localStorage.setItem(keys.token, response.token)
      saveSession(userData)
      setUser(userData)
      connectSocket(userData._id || userData.id, userData.role)
      // Refresh user-scoped preferences from DB
      try { window.dispatchEvent(new CustomEvent('auth:login')) } catch {}
      return userData
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed')
    }
  }

  const logout = () => {
    const role = user?.role
    clearSession(role)
    disconnectSocket()
    setUser(null)
    // Reset to light mode on logout — auth pages are always light
    document.documentElement.classList.remove('dark')
    // Notify ThemeContext to fall back to anonymous prefs
    try { window.dispatchEvent(new CustomEvent('auth:logout')) } catch {}
  }

  const refreshUser = async () => {
    try {
      const tag = ['admin', 'superadmin', 'moderator', 'support'].includes(user?.role || '') ? 'admin'
        : user?.role === 'agent' ? 'agent' : 'user'
      // Only check expiry if one is set (remember-me was on)
      const expiry = localStorage.getItem(`bittx_expiry_${tag}`)
      if (expiry && Date.now() > Number(expiry)) {
        logout()
        return
      }
      const res = await authApi.me()
      if (res.user) {
        const fresh = normalizeUser(res.user)
        const hasRememberMe = !!localStorage.getItem(`bittx_expiry_${tag}`)
        saveSession(fresh, hasRememberMe)
        setUser(fresh)
        connectSocket(fresh._id || fresh.id, fresh.role)
      }
    } catch (err: any) {
      // Only logout on real auth errors, not network issues
      const status = (err as any)?.status
      if (status === 401 || status === 403) {
        logout()
      }
    }
  }

  /* Listen for real-time user updates — only refresh when OUR OWN data changes */
  useEffect(() => {
    if (!user?._id) return
    const unsub = onDataUpdated((data) => {
      const myId = user._id || user.id
      // Only refresh if the event is about the currently logged-in user
      if (data.userId && data.userId === myId) {
        refreshUser()
      }
    })
    return unsub
  }, [user?._id, user?.id])

  /* Listen for real-time balance updates — instant balance without full refresh */
  useEffect(() => {
    if (!user?._id) return
    const unsub = onBalanceUpdated((data) => {
      if (data.balance !== undefined) {
        setUser(prev => {
          if (!prev) return prev
          const updated = { ...prev, balance: data.balance }
          // Also update session cache
          const tag = ['admin','superadmin','moderator','support'].includes(prev.role) ? 'admin'
            : prev.role === 'agent' ? 'agent' : 'user'
          const hasRememberMe = !!localStorage.getItem(`bittx_session_${tag}`)
          saveSession(updated, hasRememberMe)
          return updated
        })
      }
    })
    return unsub
  }, [user?._id])

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshUser,
      isAdmin:      ['admin', 'superadmin', 'moderator', 'support'].includes(user?.role ?? ''),
      isAgent:      user?.role === 'agent',
      isUser:       user?.role === 'user',
      isSuperAdmin: user?.role === 'superadmin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
