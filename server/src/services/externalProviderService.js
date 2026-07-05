/**
 * externalProviderService.js
 *
 * Generic HTTPS client for external SMS providers (5sim.net, smspva.com, etc.)
 *
 * Features:
 *   - allocateNumber(country, operator, service) — calls provider API
 *   - pollOtp(orderId) — polls provider until OTP arrives or timeout
 *   - normalizeResponse() — provider-agnostic adaptation layer
 *
 * URL templating: {country}, {operator}, {product}, {id} placeholders get replaced.
 */

const https  = require('https')
const http   = require('http')
const { URL } = require('url')

/** Replace placeholders in path */
function fillPath(path, vars = {}) {
  return path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ''))
}

/** Make HTTP request to provider. Returns { status, data, raw } */
function providerFetch({ baseUrl, method = 'GET', path, headers = {}, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    let url
    try { url = new URL(fillPath(path, {}), baseUrl) } catch (err) { return reject(err) }
    const lib = url.protocol === 'https:' ? https : http
    const opts = {
      method,
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'BITTX-SMS/1.0',
        ...headers,
      },
      timeout: timeoutMs,
    }
    const req = lib.request(opts, (res) => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        let data = null
        const ct = (res.headers['content-type'] || '').toLowerCase()
        if (ct.includes('json') && raw) {
          try { data = JSON.parse(raw) } catch { data = raw }
        } else {
          data = raw
        }
        resolve({ status: res.statusCode, data, raw })
      })
    })
    req.on('error',   err => reject(err))
    req.on('timeout', () => { req.destroy(new Error('Provider request timed out')) })
    req.end()
  })
}

/** Build headers from provider config + apiKey */
function buildHeaders(provider) {
  const h = { ...(provider.extraHeaders || {}) }
  if (provider.apiKey) {
    h['Authorization'] = `Bearer ${provider.apiKey}`
  }
  return h
}

/**
 * Allocate a number from external provider.
 * Provider-specific field mapping happens here — admin can tune these later if needed.
 *
 * Returns: { orderId, number, raw }
 * Throws on failure.
 */
async function allocateNumber(provider, { country, operator, service }) {
  const route = provider.routes?.getNumber || { method: 'GET', path: '/user/buy/activation/{country}/{operator}/{product}' }
  const path  = fillPath(route.path, {
    country:   country   || 'any',
    operator:  operator  || 'any',
    product:   service   || 'any',
  })
  const headers = buildHeaders(provider)

  const { status, data } = await providerFetch({
    baseUrl: provider.baseUrl,
    method:  route.method,
    path,
    headers,
  })

  if (status < 200 || status >= 300) {
    throw new Error(`Provider ${provider.name} returned HTTP ${status}: ${typeof data === 'string' ? data.slice(0,200) : JSON.stringify(data).slice(0,200)}`)
  }

  // Provider-agnostic field extraction (try common keys)
  const orderId = data?.id ?? data?.orderId ?? data?.activationId ?? data?.order_id ?? data?.orderid
  const phone   = data?.number ?? data?.phone ?? data?.phoneNumber ?? data?.phone_number
  if (!orderId) {
    throw new Error(`Provider ${provider.name} succeeded but no order id in response: ${JSON.stringify(data).slice(0,200)}`)
  }
  return { orderId: String(orderId), number: phone ? String(phone) : null, raw: data }
}

/**
 * Check status / fetch OTP — returns one of:
 *   { status: 'waiting', code: null }
 *   { status: 'received', code: '123456', sms: '...' }
 *   { status: 'cancelled' }
 *   { status: 'finished' }
 *   { status: 'error', message: '...' }
 */
async function checkOtp(provider, orderId) {
  const route = provider.routes?.getSms || provider.routes?.getStatus
            || { method: 'GET', path: '/user/sms/{id}' }
  const path = fillPath(route.path, { id: orderId })
  const headers = buildHeaders(provider)
  const { status, data } = await providerFetch({
    baseUrl: provider.baseUrl, method: route.method, path, headers,
  })

  // Common response shapes:
  //   { sms: [{ code: '123', text: '...' }] }              ← 5sim
  //   { status: 'CANCELED'|'RECEIVED'|... , sms: '...' }   ← smspva
  //   { code: '123456' }                                    ← generic

  if (typeof data === 'string') {
    // Try to parse if string is JSON
    try { data = JSON.parse(data) } catch {}
  }

  // Heuristics — try multiple shapes
  if (data?.sms && Array.isArray(data.sms) && data.sms.length > 0) {
    return { status: 'received', code: String(data.sms[0].code), sms: data.sms[0].text }
  }
  if (data?.sms && typeof data.sms === 'string') {
    const code = data.sms.match(/\b\d{4,8}\b/)?.[0]
    if (code) return { status: 'received', code, sms: data.sms }
  }
  if (data?.code) {
    return { status: 'received', code: String(data.code), sms: data.sms || '' }
  }
  // Status string check
  const statusStr = String(data?.status || data?.state || '').toUpperCase()
  if (statusStr === 'CANCELED' || statusStr === 'CANCELLED' || statusStr === 'CANCEL') return { status: 'cancelled' }
  if (statusStr === 'TIMEOUT'   || statusStr === 'EXPIRED')                              return { status: 'error', message: 'timeout' }
  if (statusStr === 'RECEIVED' || statusStr === 'OK' || statusStr === 'FINISHED' || statusStr === 'SUCCESS') {
    const code = data?.code || data?.sms?.match?.(/\b\d{4,8}\b/)?.[0] || null
    if (code) return { status: 'received', code: String(code), sms: data?.sms || '' }
  }
  return { status: 'waiting' }
}

/** Cancel an activation with the external provider */
async function cancelActivation(provider, orderId) {
  const route = provider.routes?.setStatus
            || { method: 'GET', path: '/user/set_status/{id}/8' }  // 8 = cancel on 5sim
  const path = fillPath(route.path, { id: orderId, status: 'cancel' })
  return providerFetch({
    baseUrl: provider.baseUrl, method: route.method, path,
    headers: buildHeaders(provider),
  })
}

/** Get provider balance */
async function getBalance(provider) {
  const route = provider.routes?.getBalance || { method: 'GET', path: '/user/balance' }
  const path  = fillPath(route.path, {})
  const { status, data } = await providerFetch({
    baseUrl: provider.baseUrl, method: route.method, path,
    headers: buildHeaders(provider),
  })
  return { status, data }
}

module.exports = {
  allocateNumber,
  checkOtp,
  cancelActivation,
  getBalance,
  providerFetch,
  fillPath,
}
