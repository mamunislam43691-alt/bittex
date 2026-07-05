/**
 * providerDiscovery.js
 *
 * Given a base URL and API key, probe the external panel to auto-detect which
 * endpoints handle which actions (getBalance / getNumber / getStatus / setStatus / getSms).
 *
 * Strategy:
 *   1. Try a list of common endpoint patterns (per-provider theme).
 *   2. For each endpoint, send a HEAD or GET request.
 *   3. Any successful response (2xx, even invalid-arg 4xx) → endpoint likely works.
 *   4. Once we find one endpoint that responds, we have a working baseline.
 *
 * After detection, admin can either:
 *   - Confirm the auto-detected config (one-click apply)
 *   - Manually adjust individual routes
 */

const svc = require('./externalProviderService')  // .providerFetch

/** Probe shape: { method, path, label, testable } */
const PROBE_PATTERNS = {
  getBalance: [
    { provider: '5sim',         method: 'GET',  path: '/user/balance' },
    { provider: 'smspva',       method: 'GET',  path: '/users/balance' },
    { provider: 'sms-activate', method: 'GET',  path: '/info/balance' },
    { provider: 'generic',      method: 'GET',  path: '/api/balance' },
    { provider: 'generic',      method: 'GET',  path: '/balance' },
    { provider: 'generic',      method: 'GET',  path: '/api/v1/balance' },
  ],
  getNumber: [
    { provider: '5sim',         method: 'GET',  path: '/user/buy/activation/russia/any/telegram' },
    { provider: 'smspva',       method: 'GET',  path: '/numbers/russia' },
    { provider: 'sms-activate', method: 'GET',  path: '/num/activate' },
    { provider: 'generic',      method: 'POST', path: '/api/getNumber' },
    { provider: 'generic',      method: 'GET',  path: '/getNumber' },
  ],
  getStatus: [
    { provider: '5sim',         method: 'GET',  path: '/user/check/0' },
    { provider: 'smspva',       method: 'GET',  path: '/numbers/status/0' },
    { provider: 'sms-activate', method: 'POST', path: '/info/checkActivation' },
    { provider: 'generic',      method: 'GET',  path: '/api/status' },
    { provider: 'generic',      method: 'GET',  path: '/status' },
  ],
  setStatus: [
    { provider: '5sim',         method: 'GET',  path: '/user/set_status/0/8' },
    { provider: 'smspva',       method: 'GET',  path: '/numbers/cancel/0' },
    { provider: 'sms-activate', method: 'POST', path: '/info/setStatus' },
    { provider: 'generic',      method: 'POST', path: '/api/cancel' },
  ],
  getSms: [
    { provider: '5sim',         method: 'GET',  path: '/user/sms/0' },
    { provider: 'smspva',       method: 'GET',  path: '/numbers/sms/0' },
    { provider: 'sms-activate', method: 'POST', path: '/info/getSms' },
    { provider: 'generic',      method: 'GET',  path: '/api/getSms' },
    { provider: 'generic',      method: 'GET',  path: '/getSms' },
  ],
}

/** Quick probe: GET/POST the path with auth header. Consider 2xx OR 401/403/404-with-body positive. */
async function probeEndpoint(baseUrl, method, path, apiKey) {
  const headers = { 'Accept': 'application/json', 'User-Agent': 'BITTX-SMS-Probe/1.0' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  try {
    const r = await svc.providerFetch({
      baseUrl, method, path, headers, timeoutMs: 8000,
    })
    // Some panels return 401 without auth, 403 when probing arbitrary IDs → still flagged positive
    // because it confirms the endpoint exists.
    if (r.status >= 200 && r.status < 500) {
      return { ok: true, status: r.status, data: r.data }
    }
    return { ok: false, status: r.status }
  } catch {
    return { ok: false }
  }
}

/**
 * Full discovery — try all patterns and return best guess per action.
 * Returns:
 *   {
 *     detected: { getBalance, getNumber, getStatus, setStatus, getSms },  // each has path/method or null
 *     raw:     [ { action, path, method, status, ok } ],                   // every probe result
 *     providerHint: '5sim' | 'smspva' | 'sms-activate' | 'generic'
 *   }
 */
async function discoverProvider(baseUrl, apiKey) {
  const raw = []
  const detected = {}

  for (const [action, patterns] of Object.entries(PROBE_PATTERNS)) {
    let best = null
    for (const p of patterns) {
      const r = await probeEndpoint(baseUrl, p.method, p.path, apiKey)
      raw.push({ action, method: p.method, path: p.path, provider: p.provider, status: r.status, ok: r.ok })
      if (r.ok && (!best || p.provider !== 'generic')) {
        best = { method: p.method, path: p.path, status: r.status, hint: p.provider }
        if (p.provider !== 'generic') break  // prefer a known match over generic fallback
      }
    }
    detected[action] = best ? { method: best.method, path: best.path, hint: best.hint } : null
  }

  // Aggregate provider hint by counting successful detections
  const hintCounts = {}
  for (const r of raw) {
    if (r.ok) hintCounts[r.provider] = (hintCounts[r.provider] || 0) + 1
  }
  const providerHint = ['5sim','smspva','sms-activate'].find(k => hintCounts[k])
                       || 'generic'

  return { detected, raw, providerHint }
}

module.exports = { discoverProvider, probeEndpoint, PROBE_PATTERNS }
