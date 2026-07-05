const router = require('express').Router()
const { ServiceProviders } = require('../db')
const { protect, authorize, requirePermission } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

const adminOnly = [protect, authorize('admin','superadmin')]

// ── Universal HTTP helper (GET or POST) ──────────────────────────────
function httpRequest(urlStr, method, body, headers) {
  return new Promise((resolve, reject) => {
    const reqUrl = new URL(urlStr)
    const lib    = reqUrl.protocol === 'https:' ? require('https') : require('http')
    const bodyStr = body ? JSON.stringify(body) : null
    const reqHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers }
    if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr)
    const r = lib.request({
      hostname: reqUrl.hostname,
      port:     reqUrl.port || (reqUrl.protocol === 'https:' ? 443 : 80),
      path:     reqUrl.pathname + reqUrl.search,
      method:   method || 'GET',
      headers:  reqHeaders,
      timeout:  12000,
    }, (resp) => {
      let data = ''
      resp.on('data', c => { data += c })
      resp.on('end', () => {
        try { resolve({ status: resp.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: resp.statusCode, body: data }) }
      })
    })
    r.on('error', reject)
    r.on('timeout', () => { r.destroy(); reject(new Error('Request timeout')) })
    if (bodyStr) r.write(bodyStr)
    r.end()
  })
}

// GET /api/service-providers
router.get('/', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const providers = await ServiceProviders.findAll()
    res.json({ providers })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/service-providers
router.post('/', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const sp = await ServiceProviders.create({ ...req.body, createdBy: req.user.id })
    propagateToSecondary('serviceproviders', { service: req.body.service, country: req.body.country }, 'insertOne', {
      ...req.body, createdBy: req.user.id, createdAt: new Date()
    }).catch(() => {})
    res.status(201).json({ provider: sp })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/service-providers/:id
router.delete('/:id', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    await ServiceProviders.delete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/service-providers/:id
router.put('/:id', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const sp = await ServiceProviders.update(req.params.id, req.body)
    if (!sp) return res.status(404).json({ message: 'Not found' })
    res.json({ provider: sp })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/service-providers/:id/numbers
router.post('/:id/numbers', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const { numbers } = req.body
    const sp = await ServiceProviders.findById(req.params.id)
    if (!sp) return res.status(404).json({ message: 'Not found' })
    const updated = await ServiceProviders.update(req.params.id, {
      numbers: [...(sp.numbers || []), ...numbers],
    })
    res.json({ provider: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/service-providers/:id/ranges
router.put('/:id/ranges', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const { ranges, autoRangeEnabled } = req.body
    const update = {}
    if (ranges !== undefined) update.ranges = ranges
    if (autoRangeEnabled !== undefined) update.autoRangeEnabled = autoRangeEnabled
    const sp = await ServiceProviders.update(req.params.id, update)
    if (!sp) return res.status(404).json({ message: 'Not found' })
    res.json({ provider: sp })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/service-providers/:id/base-urls
router.put('/:id/base-urls', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const { baseUrls } = req.body
    const sp = await ServiceProviders.update(req.params.id, { baseUrls })
    if (!sp) return res.status(404).json({ message: 'Not found' })
    res.json({ provider: sp })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/service-providers/:id/range-success
router.post('/:id/range-success', protect, async (req, res) => {
  try {
    const { range } = req.body
    const sp = await ServiceProviders.findById(req.params.id)
    if (!sp) return res.status(404).json({ message: 'Not found' })
    const ranges = (sp.ranges || []).map(r => {
      if (r.range === range) return { ...r, successCount: (r.successCount || 0) + 1 }
      return r
    })
    await ServiceProviders.update(req.params.id, { ranges })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/service-providers/:id/test-provider — test ALL base URLs (number fetch + OTP check)
router.post('/:id/test-provider', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const sp = await ServiceProviders.findById(req.params.id)
    if (!sp) return res.status(404).json({ message: 'Provider not found' })

    const baseUrls = (sp.baseUrls || [])
    if (!baseUrls.length) return res.status(400).json({ message: 'No Base URLs configured for this provider' })

    const { range } = req.body
    const rangeParam = (range || '').replace(/X+$/i, '')

    const results = []

    for (const u of baseUrls) {
      const urlLabel = u.label || 'Unnamed'
      const apiKey   = u.apiKey || ''
      const authHeaders = {
        'mauthapi':      apiKey,
        'x-api-key':     apiKey,
        'Authorization': `Bearer ${apiKey}`,
      }
      const urlResult = { label: urlLabel, apiKeySet: !!apiKey, active: u.active !== false, checks: [] }

      // ── helper: safe http call ────────────────────────────────
      async function safeHttp(url, method, body, headers) {
        try {
          return { result: await httpRequest(url, method, body, headers), error: null }
        } catch (err) {
          return { result: null, error: err.message }
        }
      }

      // ── 1. Number Fetch URL ───────────────────────────────────
      if (u.numberFetchUrl) {
        const postBody = rangeParam ? { rid: rangeParam } : {}
        const { result: r, error: err } = await safeHttp(u.numberFetchUrl, 'POST', postBody, authHeaders)
        const check = {
          type: 'numberFetch', label: 'Number Fetch URL',
          url: u.numberFetchUrl, method: 'POST', requestBody: postBody,
          ok: false, status: null, body: null, error: null, diagnosis: []
        }
        if (err) {
          check.error = err
          if (err.includes('timeout'))        check.diagnosis.push({ level: 'error', msg: 'Request timed out (12s) — provider URL is unreachable or very slow' })
          else if (err.includes('ENOTFOUND')) check.diagnosis.push({ level: 'error', msg: `Domain not found — check the URL: ${err}` })
          else if (err.includes('ECONNREFUSED')) check.diagnosis.push({ level: 'error', msg: `Connection refused — provider server may be down: ${err}` })
          else                                check.diagnosis.push({ level: 'error', msg: `Network error: ${err}` })
        } else {
          check.status = r.status
          check.body   = r.body
          check.ok     = r.status >= 200 && r.status < 300
          if (!check.ok) {
            if (r.status === 401 || r.status === 403) check.diagnosis.push({ level: 'error', msg: 'Authentication failed — API Key is wrong or missing' })
            else if (r.status === 404)                check.diagnosis.push({ level: 'error', msg: 'URL not found (404) — check the Number Fetch URL path' })
            else if (r.status === 500)                check.diagnosis.push({ level: 'error', msg: 'Provider server error (500) — provider side issue' })
            else                                      check.diagnosis.push({ level: 'error', msg: `Unexpected HTTP ${r.status} response` })
          } else {
            const b = r.body
            if (b?.meta?.code && b.meta.code !== 200) check.diagnosis.push({ level: 'warn', msg: `meta.code = ${b.meta.code} — non-200 from provider. Check range or API key.` })
            if (b?.ok === false)                       check.diagnosis.push({ level: 'warn', msg: 'ok = false — provider rejected the request. Range may be invalid.' })
            if (b?.data?.full_number)                  check.diagnosis.push({ level: 'ok',   msg: `Number allocated: ${b.data.full_number}` })
            if (b?.data?.operator)                     check.diagnosis.push({ level: 'info', msg: `Operator: ${b.data.operator}` })
            if (!b?.data && b?.ok !== true && b?.meta?.code !== 200) check.diagnosis.push({ level: 'warn', msg: 'Unexpected response format — no data/ok field.' })
            if (!apiKey)                               check.diagnosis.push({ level: 'warn', msg: 'API Key is not set' })
            if (check.diagnosis.length === 0)          check.diagnosis.push({ level: 'ok', msg: `HTTP ${r.status} — reachable` })
          }
        }
        urlResult.checks.push(check)
      } else {
        urlResult.checks.push({ type: 'numberFetch', label: 'Number Fetch URL', url: null,
          ok: false, status: null, body: null, error: null,
          diagnosis: [{ level: 'warn', msg: 'Number Fetch URL is not configured' }] })
      }

      // ── 2. OTP Check URL ──────────────────────────────────────
      if (u.liveCheckUrl) {
        const { result: r, error: err } = await safeHttp(u.liveCheckUrl, 'GET', null, authHeaders)
        const check = {
          type: 'otpCheck', label: 'OTP Check URL',
          url: u.liveCheckUrl, method: 'GET', requestBody: null,
          ok: false, status: null, body: null, error: null, diagnosis: []
        }
        if (err) {
          check.error = err
          if (err.includes('timeout'))        check.diagnosis.push({ level: 'error', msg: 'OTP Check URL timed out — unreachable or very slow' })
          else if (err.includes('ENOTFOUND')) check.diagnosis.push({ level: 'error', msg: `Domain not found for OTP Check URL: ${err}` })
          else if (err.includes('ECONNREFUSED')) check.diagnosis.push({ level: 'error', msg: `Connection refused for OTP Check URL: ${err}` })
          else                                check.diagnosis.push({ level: 'error', msg: `OTP Check URL error: ${err}` })
        } else {
          check.status = r.status
          check.body   = r.body
          check.ok     = r.status >= 200 && r.status < 300
          if (!check.ok) {
            if (r.status === 401 || r.status === 403) check.diagnosis.push({ level: 'error', msg: 'Authentication failed — API Key rejected for OTP Check URL' })
            else if (r.status === 404)                check.diagnosis.push({ level: 'error', msg: 'OTP Check URL not found (404)' })
            else                                      check.diagnosis.push({ level: 'error', msg: `HTTP ${r.status} from OTP Check URL` })
          } else {
            const b = r.body
            if (b?.data?.otps !== undefined)            check.diagnosis.push({ level: 'ok',   msg: `OTP feed reachable — ${Array.isArray(b.data.otps) ? b.data.otps.length : 0} OTP(s) in queue` })
            else if (b?.ok === true || b?.meta?.code === 200) check.diagnosis.push({ level: 'ok', msg: 'OTP Check URL responded successfully' })
            else if (b?.ok === false)                   check.diagnosis.push({ level: 'warn', msg: 'ok = false — OTP Check URL returned failure status' })
            else                                        check.diagnosis.push({ level: 'ok',   msg: `HTTP ${r.status} — reachable` })
          }
        }
        urlResult.checks.push(check)
      } else {
        urlResult.checks.push({ type: 'otpCheck', label: 'OTP Check URL', url: null,
          ok: false, status: null, body: null, error: null,
          diagnosis: [{ level: 'warn', msg: 'OTP Check URL is not configured (polling will not work)' }] })
      }

      // ── 3. Extra URLs ─────────────────────────────────────────
      for (const ex of (u.extraUrls || [])) {
        if (!ex.url) continue
        const { result: r, error: err } = await safeHttp(ex.url, 'GET', null, authHeaders)
        const check = {
          type: 'extra', label: ex.label || 'Extra URL',
          url: ex.url, method: 'GET', requestBody: null,
          ok: false, status: null, body: null, error: null, diagnosis: []
        }
        if (err) {
          check.error = err
          check.diagnosis.push({ level: 'error', msg: `Cannot reach "${ex.label || 'extra URL'}": ${err}` })
        } else {
          check.status = r.status
          check.body   = r.body
          check.ok     = r.status >= 200 && r.status < 300
          if (r.status === 401 || r.status === 403) check.diagnosis.push({ level: 'error', msg: `Auth failed (${r.status}) — API Key may be wrong` })
          else if (r.status === 404)                 check.diagnosis.push({ level: 'error', msg: 'Endpoint not found (404)' })
          else if (!check.ok)                        check.diagnosis.push({ level: 'warn',  msg: `HTTP ${r.status}` })
          else                                       check.diagnosis.push({ level: 'ok',    msg: `Reachable — HTTP ${r.status}` })
        }
        urlResult.checks.push(check)
      }

      results.push(urlResult)
    }

    const allOk = results.every(r => r.checks.every(c => c.ok || c.url === null || c.url === undefined))
    const hasErrors = results.some(r => r.checks.some(c => c.error || (!c.ok && c.url)))

    res.json({ results, allOk, hasErrors })
  } catch (err) {
    res.status(500).json({ message: err.message, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined })
  }
})

// GET /api/service-providers/ranges — available ranges for GetNumber page
// Only returns ranges from the explicit `ranges` array, NOT auto-derived from numbers.
// This prevents duplicate/per-number ranges from polluting the dropdown.
router.get('/ranges', protect, async (req, res) => {
  try {
    const providers = await ServiceProviders.findAll({ active: true })
    const rangeMap = {}

    providers.forEach(p => {
      // Add all services for this provider
      const services = (p.services?.length ? p.services : [p.service]).filter(Boolean)

      // Only use the explicit ranges[] array — never derive ranges from numbers
      if (p.ranges && p.ranges.length > 0) {
        p.ranges.filter(r => r.active).forEach(r => {
          if (!rangeMap[r.range]) {
            rangeMap[r.range] = { range: r.range, services: [], successCount: r.successCount || 0 }
          }
          services.forEach(svc => {
            if (svc && !rangeMap[r.range].services.includes(svc)) rangeMap[r.range].services.push(svc)
          })
        })
      }
    })

    res.json({ ranges: Object.values(rangeMap).sort((a, b) => b.successCount - a.successCount) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/service-providers/countries-services — countries with ranges for SEARCH tab
router.get('/countries-services', protect, async (req, res) => {
  try {
    const providers = await ServiceProviders.findAll({ active: true })
    const countryMap = {}

    providers.forEach(p => {
      const country = p.country || 'Unknown'
      if (!countryMap[country]) countryMap[country] = { country, ranges: [], services: [], totalSuccess: 0 }

      // Only use explicit ranges[] — not auto-derived from numbers
      if (p.ranges && p.ranges.length > 0) {
        p.ranges.filter(r => r.active).forEach(r => {
          if (!countryMap[country].ranges.includes(r.range)) countryMap[country].ranges.push(r.range)
          countryMap[country].totalSuccess += r.successCount || 0
        })
      }

      const services = (p.services?.length ? p.services : [p.service]).filter(Boolean)
      services.forEach(svc => {
        if (svc && !countryMap[country].services.includes(svc)) countryMap[country].services.push(svc)
      })
    })

    const countries = Object.values(countryMap)
      .filter(c => c.ranges.length > 0)
      .sort((a, b) => b.totalSuccess - a.totalSuccess)

    res.json({ countries })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/service-providers/cleanup-ranges
// Removes auto-generated per-number ranges (ranges that match individual number patterns
// like 224654547XXX instead of proper prefixes like 224654XXXXXX).
// Safe to call multiple times — idempotent.
router.post('/cleanup-ranges', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const ServiceProvider = require('../models/ServiceProvider')
    const providers = await ServiceProvider.find({}).lean()
    let cleaned = 0

    for (const p of providers) {
      if (!p.ranges || p.ranges.length === 0) continue

      // A "garbage" range is one that looks like it was derived from a specific number:
      // e.g. 224654547XXX (9 digits + XXX = 12 chars) vs a proper prefix 224654XXXXXX
      // Heuristic: if the non-X part is 9+ digits long, it's likely per-number garbage.
      // A real range prefix should be 6-8 digits (country code + area).
      const validRanges = p.ranges.filter(r => {
        const digits = r.range.replace(/X+$/i, '')
        // Keep ranges where the numeric prefix is ≤ 8 digits (proper prefix)
        // Remove if 9+ digits (almost certainly auto-derived from a specific number)
        return digits.length <= 8
      })

      if (validRanges.length < p.ranges.length) {
        await ServiceProvider.findByIdAndUpdate(p._id, { $set: { ranges: validRanges } })
        cleaned += p.ranges.length - validRanges.length
      }
    }

    res.json({ success: true, message: `Cleaned ${cleaned} auto-generated ranges across ${providers.length} providers` })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
