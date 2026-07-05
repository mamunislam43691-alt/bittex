// Central API client for BITTX SMS
// In production (Railway), frontend and backend run on the same host,
// so we use a relative /api path. In local dev, we fallback to localhost:5000.
const BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')

/** Normalize email: strip dots from local part for Gmail-like providers */
export function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@')
  if (!domain) return email.toLowerCase().trim()
  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    return local.replace(/\./g, '') + '@' + domain
  }
  return email.toLowerCase().trim()
}

const ACTIVE_PANEL_KEY = 'bittx_active_panel'

/** Tag for a given panel/role */
export function tagForPanel(panel: 'admin' | 'agent' | 'user' | string): 'admin' | 'agent' | 'user' {
  if (['admin','superadmin','moderator','support'].includes(panel)) return 'admin'
  if (panel === 'agent') return 'agent'
  return 'user'
}

/** Persist which panel the user is currently logged in from.
 *  This prevents cross-panel session collisions on reload (e.g. leftover admin session
 *  being picked instead of user/agent session). */
export function setActivePanel(panel: 'admin' | 'agent' | 'user') {
  try { localStorage.setItem(ACTIVE_PANEL_KEY, panel) } catch {}
}

export function getActivePanel(): 'admin' | 'agent' | 'user' | null {
  try {
    const v = localStorage.getItem(ACTIVE_PANEL_KEY)
    if (v === 'admin' || v === 'agent' || v === 'user') return v
  } catch {}
  return null
}

function getToken(): string | null {
  // Prefer the panel the user is currently logged into (avoids cross-panel collisions)
  const active = getActivePanel()
  if (active) {
    const t = localStorage.getItem(`bittx_token_${active}`)
    if (t) return t
  }
  // Fallback: iterate all tags in stable order
  for (const tag of ['admin', 'agent', 'user'] as const) {
    const t = localStorage.getItem(`bittx_token_${tag}`)
    if (t) return t
  }
  return null
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  useApiKey = false
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (useApiKey) {
    const apiKey = localStorage.getItem('bittx_api_key')
    if (apiKey) headers['x-api-key'] = apiKey
  } else {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({ message: 'No response body' }))
  if (!res.ok) {
    const err: any = new Error(data.message || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body: any) => request<T>('PUT', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
  // API key authenticated requests
  getWithKey: <T = any>(path: string) => request<T>('GET', path, undefined, true),
  postWithKey: <T = any>(path: string, body: any) => request<T>('POST', path, body, true),
}

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { username: string; email: string; phone: string; password: string; agentEmail?: string; firstName?: string; lastName?: string; country?: string; city?: string; }) =>
    api.post('/auth/register', data),

  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout', {}),
  checkAgent: (agentEmail: string) => api.post('/auth/check-agent', { agentEmail }),
  checkUsername: (username: string) => api.post('/auth/check-username', { username }),
}

// ── Users ─────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  create: (data: any) => api.post('/users', data),
  delete: (id: string) => api.delete(`/users/${id}`),
  stats: (id: string) => api.get(`/users/${id}/stats`),
  genApiKey: (id: string) => api.post(`/users/${id}/api-key`, {}),
  setCommission: (id: string, commission: number | null) =>
    api.put(`/users/${id}/commission`, { commission }),
}

// ── Profile ───────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.put('/profile', data),
  // Per-user UI preferences (theme, accent, language, sidebar collapse)
  getPreferences: () => api.get('/profile/preferences'),
  savePreferences: (prefs: Record<string, any>) => api.put('/profile/preferences', prefs),
  genApiKey: () => api.post('/profile/api-key', {}),
  deleteApiKey: () => api.delete('/profile/api-key'),
  createTicket: (subject: string, message: string) =>
    api.post('/profile/support', { subject, message }),
  tickets: () => api.get('/profile/support'),
  ticket: (id: string) => api.get(`/profile/support/${id}`),
  replyTicket: (id: string, text: string, image?: string) =>
    api.post(`/profile/support/${id}/reply`, { text, image }),
  closeTicket: (id: string) => api.put(`/profile/support/${id}/close`, {}),
}

// ── OTPs ──────────────────────────────────────────────────
export const otpsApi = {
  list: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams(params as any).toString()
    return api.get(`/otps${q ? '?' + q : ''}`)
  },
  stats: () => api.get('/otps/stats'),
  allocate: (range: string, service?: string) =>
    api.post('/otps/allocate', { range, service }),  // uses JWT auth (server accepts both JWT + apiKey)
  receive: (number: string, otp: string, service: string, apiKey: string) =>
    api.post('/otps/receive', { number, otp, service, apiKey }),
  check: (number: string) =>
    api.getWithKey(`/otps/check?number=${number}`),
  live: () => api.get('/otps/live'),
  dailyReport: (days = 7) => api.get(`/otps/daily-report?days=${days}`),
  senderRanges: () => api.get('/otps/sender-ranges'),
}

// ── Withdrawals ───────────────────────────────────────────
export const withdrawalsApi = {
  list: (status?: string) => api.get(`/withdrawals${status ? '?status=' + status : ''}`),
  create: (amount: number, network: string, address: string) =>
    api.post('/withdrawals', { amount, network, address }),
  process: (id: string, status: 'approved' | 'rejected') =>
    api.put(`/withdrawals/${id}`, { status }),
  approveAll: () => api.put('/withdrawals/approve-all', {}),
  clearProcessed: () => api.delete('/withdrawals/clear-processed'),
}

// ── Withdrawal Methods ────────────────────────────────────
export const withdrawalMethodsApi = {
  list: () => api.get('/withdrawal-methods'),
  listAll: () => api.get('/withdrawal-methods/all'),
  create: (data: any) => api.post('/withdrawal-methods', data),
  update: (id: string, data: any) => api.put(`/withdrawal-methods/${id}`, data),
  remove: (id: string) => api.delete(`/withdrawal-methods/${id}`),
}

// ── Admin ─────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  dbStats: () => api.get('/admin/db-stats'),
  announcements: () => api.get('/admin/announcements'),
  createAnnouncement: (data: any) => api.post('/admin/announcements', data),
  updateAnnouncement: (id: string, data: any) => api.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/admin/announcements/${id}`),
  newsfeed: () => api.get('/admin/newsfeed'),
  createPost: (data: any) => api.post('/admin/newsfeed', data),
  updatePost: (id: string, data: any) => api.put(`/admin/newsfeed/${id}`, data),
  deletePost: (id: string) => api.delete(`/admin/newsfeed/${id}`),
  tickets: () => api.get('/admin/support'),
  ticket: (id: string) => api.get(`/admin/support/${id}`),
  replyTicket: (id: string, text: string, image?: string) =>
    api.post(`/admin/support/${id}/reply`, { text, image }),
  closeTicket: (id: string) => api.put(`/admin/support/${id}/close`, {}),
  // Agents
  agents: () => api.get('/admin/agents'),
  createAgent: (data: any) => api.post('/admin/agents', data),
  updateAgent: (id: string, data: any) => api.put(`/admin/agents/${id}`, data),
  deleteAgent: (id: string) => api.delete(`/admin/agents/${id}`),
  // Staff (admin/moderator/support)
  listStaff: () => api.get('/admin/staff'),
  createStaff: (data: any) => api.post('/admin/staff', data),
  updateStaff: (id: string, data: any) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id: string) => api.delete(`/admin/staff/${id}`),
  permissions: () => api.get('/admin/permissions'),
  // Analytics
  revenueAnalytics: (days = 30) => api.get(`/admin/analytics/revenue?days=${days}`),
  countriesAnalytics: () => api.get('/admin/analytics/countries'),
  // Database
  wipeDatabase: () => api.post('/admin/wipe', {}),
  exportDatabase: () =>
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api') + '/admin/export',
  syncBalances: () => api.post('/admin/sync-balances', {}),
}

// ── Agent analytics (scoped to the logged-in agent) ─────
export const agentApi = {
  stats:            () => api.get('/agent-analytics/stats'),
  revenueAnalytics: (days = 30) => api.get(`/agent-analytics/revenue?days=${days}`),
  countries:        () => api.get('/agent-analytics/countries'),
}

// ── Settings ──────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  getAll: () => api.get('/settings/all'),
  save: (settings: Record<string, any>) => api.put('/settings', settings),
}

// ── Service Providers ─────────────────────────────────────
export const spApi = {
  list: () => api.get('/service-providers'),
  create: (data: any) => api.post('/service-providers', data),
  update: (id: string, data: any) => api.put(`/service-providers/${id}`, data),
  delete: (id: string) => api.delete(`/service-providers/${id}`),
  addNumbers: (id: string, numbers: any[]) =>
    api.post(`/service-providers/${id}/numbers`, { numbers }),
  updateRanges: (id: string, ranges: any[], autoRangeEnabled?: boolean) =>
    api.put(`/service-providers/${id}/ranges`, { ranges, autoRangeEnabled }),
  updateBaseUrls: (id: string, baseUrls: any[]) =>
    api.put(`/service-providers/${id}/base-urls`, { baseUrls }),
  fetchNumbers: (id: string, baseUrlIndex?: number, range?: string) =>
    api.post(`/service-providers/${id}/fetch-numbers`, { baseUrlIndex, range }),
  getRanges: () => api.get('/service-providers/ranges'),
  getCountriesServices: () => api.get('/service-providers/countries-services'),
}
