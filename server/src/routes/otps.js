const router  = require('express').Router()
const { OTPLogs, Users, Agents, ServiceProviders } = require('../db')
const { protect, apiKeyAuth } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

const OTP_USER_RATE_DEFAULT  = parseFloat(process.env.OTP_USER_RATE        || '0.005')
const OTP_AGENT_COMM_DEFAULT = parseFloat(process.env.OTP_AGENT_COMMISSION || '15') / 100
const FAIL_TIMEOUT   = 20 * 60 * 1000

// Load OTP pricing from DB settings (falls back to env defaults)
// Accepts optional range (for per-range price), provider, and userId (for per-user commission)
async function getOtpRates(range, provider, userId) {
  try {
    // Check if the user has a custom commission rate set by their agent
    let agentCommOverride = null
    if (userId) {
      const { Users } = require('../db')
      const user = await Users.findById(userId)
      if (user && user.customCommission != null) {
        agentCommOverride = user.customCommission / 100
      }
    }

    // Check if there's a per-range price override
    if (range && provider?.ranges?.length > 0) {
      const normalizeR = (r) => r ? r.replace(/X+$/i, '').replace(/x+$/i, '') : ''
      const rangePrefix = normalizeR(range)
      const matched = provider.ranges.find(r => {
        const rp = normalizeR(r.range)
        return rp === rangePrefix || rangePrefix.startsWith(rp) || rp.startsWith(rangePrefix)
      })
      if (matched && matched.pricePerOtp != null && matched.pricePerOtp > 0) {
        const Settings = require('../models/Settings')
        const s = await Settings.findOne({ key: 'otpPricing' }).lean()
        const agentComm = agentCommOverride !== null
          ? agentCommOverride
          : (s?.value ? parseFloat(s.value.agentComm || (OTP_AGENT_COMM_DEFAULT * 100)) / 100 : OTP_AGENT_COMM_DEFAULT)
        return { userRate: matched.pricePerOtp, agentComm }
      }
    }

    // Fall back to global settings
    const Settings = require('../models/Settings')
    const s = await Settings.findOne({ key: 'otpPricing' }).lean()
    if (s?.value) {
      const userRate  = parseFloat(s.value.userRate   || OTP_USER_RATE_DEFAULT)
      const agentComm = agentCommOverride !== null
        ? agentCommOverride
        : parseFloat(s.value.agentComm || (OTP_AGENT_COMM_DEFAULT * 100)) / 100
      return { userRate, agentComm }
    }
  } catch {}
  return { userRate: OTP_USER_RATE_DEFAULT, agentComm: OTP_AGENT_COMM_DEFAULT }
}

// Helper: increment balance in correct collection
async function incrementBalance(role, id, fields) {
  if (role === 'agent') return await Agents.increment(id, fields)
  return await Users.increment(id, fields)
}

// GET /api/otps
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 100, status } = req.query
    const filter = { limit: parseInt(limit) }
    if (req.user.role === 'user')  filter.userId  = String(req.user._id || req.user.id)
    if (req.user.role === 'agent') filter.agentId = String(req.user._id || req.user.id)
    if (status) filter.status = status
    const logs = await OTPLogs.find(filter)

    // Enrich with username for admin/staff views
    if (['admin','superadmin','moderator','support'].includes(req.user.role)) {
      const userIds = [...new Set(logs.map(l => String(l.userId)).filter(Boolean))]
      const userMap = {}
      await Promise.all(userIds.map(async uid => {
        try {
          const u = await Users.findById(uid)
          if (u) userMap[uid] = u.username || u.email || uid
        } catch {}
      }))
      const enriched = logs.map(l => ({
        ...l,
        username: userMap[String(l.userId)] || l.username || String(l.userId || '—'),
      }))
      return res.json({ logs: enriched })
    }

    res.json({ logs })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/otps/live  (admin monitor — all recent successful OTPs with username)
router.get('/live', protect, async (req, res) => {
  try {
    const filter = { status: 'success', limit: 150 }
    if (req.user.role === 'agent') filter.agentId = String(req.user._id || req.user.id)
    const logs = await OTPLogs.find(filter)

    // Enrich with username
    const userIds = [...new Set(logs.map(l => String(l.userId)).filter(Boolean))]
    const userMap = {}
    await Promise.all(userIds.map(async uid => {
      try {
        const u = await Users.findById(uid)
        if (u) userMap[uid] = u.username || u.email || uid
      } catch {}
    }))

    const enriched = logs.map(l => ({
      ...l,
      username: userMap[String(l.userId)] || l.username || String(l.userId || '—'),
    }))

    res.json({ logs: enriched })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/otps/allocate  (user requests a number — via API key OR JWT)
router.post('/allocate', async (req, res) => {
  // Support both API-key auth and JWT auth
  let reqUser = null
  // Try API key first
  try {
    const apiKey = req.headers['x-api-key']
    if (apiKey) {
      const { Users } = require('../db')
      const user = await Users.findByApiKey(apiKey)
      if (user && user.apiEnabled) reqUser = user
    }
  } catch {}
  // Fall back to JWT
  if (!reqUser) {
    try {
      const jwt = require('jsonwebtoken')
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bittx_jwt_secret_2024')
        const { Users } = require('../db')
        reqUser = await Users.findById(decoded.id || decoded._id)
      }
    } catch {}
  }
  if (!reqUser) return res.status(401).json({ message: 'Authentication required' })
  req.user = reqUser
  try {
    const { range, service } = req.body
    const provider = await ServiceProviders.findAvailable(range)
    if (!provider) return res.status(404).json({ message: 'No available numbers for this range' })

    // Find an available number:
    // 1. Exact range match first
    // 2. Then numbers with no range assigned (they belong to the provider's configured range)
    // 3. Then any unused number if no range filter
    const normalizeR = (r) => r ? r.replace(/X+$/i, '').replace(/x+$/i, '') : ''
    let numEntry = null
    if (range) {
      const rp = normalizeR(range)
      // Try exact/prefix match on number.range
      numEntry = provider.numbers.find(n => {
        if (n.used) return false
        const nr = normalizeR(n.range || '')
        if (!nr) return true // no range on number → belongs to this provider → use it
        return nr === rp || nr.startsWith(rp) || rp.startsWith(nr)
      })
    } else {
      numEntry = provider.numbers.find(n => !n.used)
    }

    // If no manual numbers and provider has auto mode + base URLs, fetch from external
    if (!numEntry && provider.numberInputMode === 'auto' && provider.baseUrls?.length > 0) {
      const activeUrl = provider.baseUrls.find(u => u.active && u.numberFetchUrl)
      if (activeUrl) {
        try {
          // Determine best range to use
          let targetRange = range
          if (!targetRange) {
            if (provider.autoRangeEnabled && provider.ranges?.length > 0) {
              const activeRanges = provider.ranges.filter(r => r.active)
              if (activeRanges.length > 0) {
                targetRange = activeRanges.sort((a, b) => b.successCount - a.successCount)[0].range
              }
            } else if (provider.ranges?.length > 0) {
              const activeRanges = provider.ranges.filter(r => r.active).sort((a, b) => a.priority - b.priority)
              if (activeRanges.length > 0) targetRange = activeRanges[0].range
            }
          } else if (!targetRange.includes('XXX') && provider.ranges?.length > 0) {
            const match = provider.ranges.find(r => r.active && r.range.startsWith(targetRange))
            if (match) targetRange = match.range
          }

          // Range param — digits only, no XXX (e.g. "26134" or "2290194")
          const rangeParam = targetRange ? targetRange.replace(/X+$/i, '').replace(/x+$/i, '') : ''

          // ── Universal HTTP request helper ──
          // Supports GET and POST, auto-detects Content-Type
          const makeRequest = (urlStr, method, body, headers) => {
            return new Promise((resolve, reject) => {
              const reqUrl = new URL(urlStr)
              const lib = reqUrl.protocol === 'https:' ? require('https') : require('http')
              const bodyStr = body ? JSON.stringify(body) : null
              const reqHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers,
              }
              if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr)
              const r = lib.request({
                hostname: reqUrl.hostname,
                port: reqUrl.port || (reqUrl.protocol === 'https:' ? 443 : 80),
                path: reqUrl.pathname + reqUrl.search,
                method: method || 'GET',
                headers: reqHeaders,
                timeout: 12000,
              }, (resp) => {
                let data = ''
                resp.on('data', c => { data += c })
                resp.on('end', () => {
                  try { resolve({ status: resp.statusCode, body: JSON.parse(data) }) }
                  catch { resolve({ status: resp.statusCode, body: data }) }
                })
              })
              r.on('error', reject)
              r.on('timeout', () => { r.destroy(); reject(new Error('timeout')) })
              if (bodyStr) r.write(bodyStr)
              r.end()
            })
          }

          // ── Build auth headers — support multiple header formats ──
          const authHeaders = {}
          if (activeUrl.apiKey) {
            authHeaders['mauthapi']       = activeUrl.apiKey   // 2oo9-style
            authHeaders['x-api-key']      = activeUrl.apiKey   // generic
            authHeaders['Authorization']  = `Bearer ${activeUrl.apiKey}`  // Bearer
          }

          // ── Fetch number — try POST first (standard for most panels) ──
          // POST body: { "rid": rangeParam } (2oo9-style) or GET with ?range= params
          let result = null
          let fetchedNumber = null
          let derivedR = targetRange || ''

          // Attempt 1: POST with rid body (2oo9, smspva, etc.)
          try {
            const postBody = {}
            if (rangeParam) postBody.rid = rangeParam
            if (service || provider.service) postBody.service = service || provider.service

            const postResult = await makeRequest(activeUrl.numberFetchUrl, 'POST', postBody, authHeaders)
            console.log(`[Auto POST] Status ${postResult.status}:`, JSON.stringify(postResult.body).slice(0, 100))

            if (postResult.status < 400 && postResult.body) {
              // Normalize data: handle both array and object responses
              // { ok:true, data:[{number,...}] }  ← this provider format
              // { meta:{code:200}, data:{full_number,...} }  ← 2oo9 format
              // { number:"..." }  ← generic
              let rawData = postResult.body?.data || postResult.body
              if (Array.isArray(rawData)) rawData = rawData[0] || {}

              const isOk = postResult.body?.ok === true
                        || postResult.body?.meta?.code === 200
                        || postResult.body?.meta?.status === 'ok'
                        || postResult.status === 200

              if (isOk) {
                fetchedNumber = rawData?.full_number || rawData?.no_plus_number
                             || rawData?.national_number || rawData?.number
                if (fetchedNumber) fetchedNumber = String(fetchedNumber).replace(/^\+/, '')
              }
              result = postResult
            }
          } catch (postErr) {
            console.error('[Auto POST] Error:', postErr.message)
          }

          // Attempt 2: GET with query params (fallback)
          if (!fetchedNumber) {
            try {
              const getUrl = new URL(activeUrl.numberFetchUrl)
              if (rangeParam) getUrl.searchParams.set('range', rangeParam)
              if (rangeParam) getUrl.searchParams.set('rid', rangeParam)
              if (service || provider.service) getUrl.searchParams.set('service', service || provider.service)
              if (activeUrl.apiKey) getUrl.searchParams.set('apikey', activeUrl.apiKey)

              const getResult = await makeRequest(getUrl.toString(), 'GET', null, authHeaders)
              console.log(`[Auto GET] Status ${getResult.status}:`, JSON.stringify(getResult.body).slice(0, 100))

              if (getResult.status < 400 && getResult.body) {
                let rawData2 = getResult.body?.data || getResult.body
                if (Array.isArray(rawData2)) rawData2 = rawData2[0] || {}
                fetchedNumber = rawData2?.full_number || rawData2?.no_plus_number
                             || rawData2?.number || rawData2?.national_number
                if (fetchedNumber) fetchedNumber = String(fetchedNumber).replace(/^\+/, '')
                result = getResult
              }
            } catch (getErr) {
              console.error('[Auto GET] Error:', getErr.message)
            }
          }

          // ── Check provider out-of-stock response ──
          if (result?.body?.meta?.code === 2946 || result?.body?.meta?.status === 'not_found') {
            console.log('[Auto] Provider out of stock for range:', rangeParam)
          } else if (fetchedNumber) {
            // Derive range from number if not provided
            const cleanNum = fetchedNumber.replace(/\D/g, '')
            derivedR = result?.body?.data?.range || result?.body?.range ||
              (cleanNum.length >= 4 ? cleanNum.slice(0, -3) + 'XXX' : targetRange || '')

            // Save to provider & create OTP log
            await ServiceProviders.update(provider._id || provider.id, {
              numbers: [...(provider.numbers || []), {
                number: cleanNum, range: derivedR, used: true, usedAt: new Date()
              }]
            })

            const userId  = String(req.user._id || req.user.id)
            const agentId = req.user.agentId ? String(req.user.agentId) : null
            const log = await OTPLogs.create({
              userId, agentId,
              number: cleanNum, range: derivedR,
              service: service || provider.service,
              country: result?.body?.data?.country || provider.country,
            })
            await Users.update(userId, { otpActive: true, lastOtpAt: new Date() })
            await Users.increment(userId, { otpCount: 1 })

            // Auto-fail after 20 minutes
            setTimeout(async () => {
              const fresh = await OTPLogs.findById(log._id || log.id)
              if (fresh?.status === 'pending') {
                await OTPLogs.update(log._id || log.id, { status: 'failed', resolvedAt: new Date() })
                if (global.io) global.io.to(`user_${userId}`).emit('otp_failed', { logId: log._id || log.id, number: cleanNum })
              }
            }, FAIL_TIMEOUT)

            console.log(`[Auto] ✓ Got number ${cleanNum} (${derivedR}) from provider`)

            // ── Poll for OTP via provider's success-otp / liveCheckUrl ──
            // liveCheckUrl = provider's endpoint (e.g. 2oo9 /success-otp) — we GET this
            // otpReceiveUrl = OUR server endpoint (provider POSTs here) — do NOT poll this
            const pollUrl = activeUrl.liveCheckUrl  // provider's check/success-otp URL
            if (pollUrl) {
              const pollInterval = 5000
              const maxPolls = 240   // 20 minutes max (matches FAIL_TIMEOUT)
              let pollCount = 0
              const logId = log._id || log.id

              const poll = setInterval(async () => {
                pollCount++
                if (pollCount > maxPolls) { clearInterval(poll); return }
                try {
                  // GET provider's success-otp / liveCheck endpoint with API key in header
                  const pollResult = await makeRequest(pollUrl, 'GET', null, authHeaders)
                  if (pollResult.status < 400 && pollResult.body) {
                    const body = pollResult.body

                    // ── Normalize response to OTP list ──
                    // Format A: { meta:{code:200}, data:{ otps:[{number,message}] } }  ← 2oo9
                    // Format B: { ok:true, data:[{number,status,message}] }            ← this provider
                    // Format C: { otps:[...] }                                          ← generic
                    let otpList = body?.data?.otps || body?.otps || []

                    // Handle format B: data is a flat array of number objects
                    if (!otpList.length && Array.isArray(body?.data)) {
                      otpList = body.data
                    }

                    // Match by phone number, but ONLY if OTP/message is present
                    const match = otpList.find(o => {
                      const oNum = String(o.number || o.full_number || o.no_plus_number || '').replace(/^\+/, '')
                      const hasOtp = o.message || o.sms || o.text || o.otp || o.code
                      return hasOtp && (oNum === cleanNum || oNum.endsWith(cleanNum) || cleanNum.endsWith(oNum))
                    })

                    if (match) {
                      clearInterval(poll)
                      // Extract OTP code from message text (4-8 digit number)
                      const rawMsg = match.message || match.sms || match.text || ''
                      const otpMatchResult = rawMsg.match(/\b(\d{4,8})\b/)
                      const otpCode = otpMatchResult
                        ? otpMatchResult[1]
                        : (match.otp || match.code || String(rawMsg).slice(0, 10))

                      const freshLog = await OTPLogs.findById(logId)
                      if (freshLog?.status === 'pending') {
                        const { userRate, agentComm } = await getOtpRates(derivedR, provider, String(freshLog.userId))
                        const eu = userRate * (1 - agentComm), ea = userRate * agentComm
                        await OTPLogs.update(logId, {
                          status: 'success', otp: String(otpCode),
                          message: rawMsg || `Your code: ${otpCode}`,
                          resolvedAt: new Date(), earnedUser: eu, earnedAgent: ea
                        })
                        await Users.increment(freshLog.userId, { balance: eu, totalEarned: eu })
                        if (freshLog.agentId) await Agents.increment(freshLog.agentId, { balance: ea, totalEarned: ea, totalCommission: ea })
                        if (global.io) {
                          global.io.to(`user_${freshLog.userId}`).emit('otp_received', { logId, number: cleanNum, otp: String(otpCode), service: provider.service, earned: eu })
                          global.io.to('admin').emit('otp_live', { number: cleanNum, otp: String(otpCode), service: provider.service, country: provider.country, range: derivedR, ts: new Date().toISOString() })
                          global.io.to('admin').emit('data_updated', { type: 'otps', userId: String(freshLog.userId) })
                          global.io.to(`user_${freshLog.userId}`).emit('balance_updated', { balance: (await Users.findById(freshLog.userId))?.balance || 0 })
                        }
                        console.log(`[Poll] ✓ OTP ${otpCode} delivered for ${cleanNum}`)
                      }
                    }
                  }
                } catch (pollErr) {
                  console.error(`[Poll] Error polling ${pollUrl}:`, pollErr.message)
                }
              }, pollInterval)
            } else {
              console.log(`[Auto] No liveCheckUrl configured — OTP will arrive via webhook (POST /api/otps/receive)`)
            }

            return res.json({
              status: 'pending', logId: log._id || log.id,
              number: cleanNum, range: derivedR,
              country: result?.body?.data?.country || provider.country,
            })
          }
        } catch (fetchErr) {
          console.error('[Auto] Fetch number error:', fetchErr.message)
        }
      }
    }
    if (!numEntry) return res.status(404).json({ message: 'No numbers available' })

    numEntry.used   = true
    numEntry.usedAt = new Date()
    await ServiceProviders.update(provider._id || provider.id, { numbers: provider.numbers })

    const userId  = String(req.user._id || req.user.id)
    const agentId = req.user.agentId ? String(req.user.agentId) : null

    const log = await OTPLogs.create({
      userId, agentId,
      number:  numEntry.number,
      range:   numEntry.range,
      service: service || provider.service,
      country: provider.country,
    })
    // Propagate OTP log to secondary DBs
    propagateToSecondary('otplogs', { userId, number: numEntry.number, service: service || provider.service }, 'insertOne', {
      userId, agentId, number: numEntry.number, range: numEntry.range,
      service: service || provider.service, country: provider.country,
      status: 'pending', createdAt: new Date()
    }).catch(() => {})

    await Users.update(userId, { otpActive: true, lastOtpAt: new Date() })
    await Users.increment(userId, { otpCount: 1 })

    // Auto-fail after 20 minutes if no OTP received
    setTimeout(async () => {
      const fresh = await OTPLogs.findById(log._id || log.id)
      if (fresh?.status === 'pending') {
        await OTPLogs.update(log._id || log.id, { status: 'failed', resolvedAt: new Date() })
        if (global.io) global.io.to(`user_${userId}`).emit('otp_failed', { logId: log._id || log.id, number: numEntry.number })
      }
    }, FAIL_TIMEOUT)

    // Manual mode: if provider has a liveCheckUrl (e.g. 2oo9 /success-otp), poll it for OTP
    // liveCheckUrl = provider's check endpoint (GET) — NOT otpReceiveUrl (which is our own server webhook)
    const manualCheckUrl = provider.baseUrls?.find(u => u.active && u.liveCheckUrl)
    if (manualCheckUrl && manualCheckUrl.liveCheckUrl) {
      const pollUrl = manualCheckUrl.liveCheckUrl
      const logId = log._id || log.id
      const pollInterval = 5000
      const maxPolls = 240  // 20 minutes max (matches FAIL_TIMEOUT)
      let pollCount2 = 0
      const manualAuthHeaders = {}
      if (manualCheckUrl.apiKey) {
        manualAuthHeaders['mauthapi']      = manualCheckUrl.apiKey
        manualAuthHeaders['x-api-key']     = manualCheckUrl.apiKey
        manualAuthHeaders['Authorization'] = `Bearer ${manualCheckUrl.apiKey}`
      }
      const poll2 = setInterval(async () => {
        pollCount2++
        if (pollCount2 > maxPolls) { clearInterval(poll2); return }
        try {
          const lib3 = pollUrl.startsWith('https') ? require('https') : require('http')
          const cUrl = new URL(pollUrl)
          const pr = await new Promise((rs, rj) => {
            const r3 = lib3.request({
              hostname: cUrl.hostname, port: cUrl.port || (cUrl.protocol === 'https:' ? 443 : 80),
              path: cUrl.pathname + cUrl.search, method: 'GET',
              headers: { 'Accept': 'application/json', ...manualAuthHeaders },
              timeout: 8000,
            }, (resp3) => {
              let d = ''; resp3.on('data', c => { d += c })
              resp3.on('end', () => { try { rs(JSON.parse(d)) } catch { rs(null) } })
            })
            r3.on('error', rj)
            r3.on('timeout', () => { r3.destroy(); rj(new Error('timeout')) })
            r3.end()
          })
          if (!pr) return

          // Match OTP list from various response shapes:
          // 2oo9: { meta:{code:200}, data:{ otps:[{otp_id, number, message, time}] } }
          // Format B: { ok:true, data:[{number,status,message}] }
          // generic: { otps:[...] } or { data:{otps:[...]} }
          let otpList = pr?.data?.otps || pr?.otps || []
          if (!otpList.length && Array.isArray(pr?.data)) otpList = pr.data

          const match = otpList.find(o => {
            const oNum = String(o.number || o.full_number || o.no_plus_number || '').replace(/^\+/, '')
            const hasOtp = o.message || o.sms || o.text || o.otp || o.code
            return hasOtp && (oNum === numEntry.number || oNum.endsWith(numEntry.number) || numEntry.number.endsWith(oNum))
          })

          if (match) {
            clearInterval(poll2)
            const rawMsg = match.message || match.sms || match.text || ''
            const otpMatch2 = rawMsg.match(/\b(\d{4,8})\b/)
            const otpCode = otpMatch2 ? otpMatch2[1] : (match.otp || match.code || String(rawMsg).slice(0,10))

            const freshLog2 = await OTPLogs.findById(logId)
            if (freshLog2?.status === 'pending') {
              const { userRate: ur2, agentComm: ac2 } = await getOtpRates(numEntry?.range, provider, String(freshLog2.userId))
              const eu2 = ur2 * (1 - ac2), ea2 = ur2 * ac2
              await OTPLogs.update(logId, {
                status: 'success', otp: String(otpCode),
                message: rawMsg || `Your ${provider.service} code is: ${otpCode}`,
                resolvedAt: new Date(), earnedUser: eu2, earnedAgent: ea2
              })
              await Users.increment(freshLog2.userId, { balance: eu2, totalEarned: eu2 })
              if (freshLog2.agentId) await Agents.increment(freshLog2.agentId, { balance: ea2, totalEarned: ea2, totalCommission: ea2 })
              if (global.io) {
                global.io.to(`user_${freshLog2.userId}`).emit('otp_received', { logId, number: numEntry.number, otp: String(otpCode), service: provider.service, earned: eu2 })
                global.io.to('admin').emit('otp_live', { number: numEntry.number, otp: String(otpCode), service: provider.service, country: provider.country, range: numEntry.range, ts: new Date().toISOString() })
                global.io.to('admin').emit('data_updated', { type: 'otps', userId: String(freshLog2.userId) })
                global.io.to(`user_${freshLog2.userId}`).emit('balance_updated', { balance: (await Users.findById(freshLog2.userId))?.balance || 0 })
              }
              console.log(`[ManualPoll] ✓ OTP ${otpCode} delivered for ${numEntry.number}`)
            }
          }
        } catch (pollErr2) {
          console.error(`[ManualPoll] Error:`, pollErr2.message)
        }
      }, pollInterval)
    }

    res.json({
      status: 'pending', logId: log._id || log.id,
      number: numEntry.number, range: numEntry.range, country: provider.country,
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/otps/receive  (service provider sends OTP)
router.post('/receive', async (req, res) => {
  try {
    const { number, otp, service, apiKey, sender } = req.body
    const providers = await ServiceProviders.findAll({ active: true })

    // Auth: match by extApiKey (legacy) OR any baseUrls[].apiKey
    const provider = providers.find(p => {
      if (p.extApiKey && p.extApiKey === apiKey) return true
      if (p.baseUrls && p.baseUrls.some(u => u.apiKey && u.apiKey === apiKey)) return true
      return false
    })
    if (!provider) return res.status(401).json({ message: 'Invalid provider API key' })

    const log = await OTPLogs.findPendingByNumber(number)
    if (!log) return res.status(404).json({ message: 'No pending OTP for this number' })

    // Load current rates from DB settings
    const { userRate, agentComm } = await getOtpRates(log.range, provider, String(log.userId))

    // Check per-range price override on the matched range slot
    const logRange = log.range || (number && number.length >= 4 ? number.slice(0, -3) + 'XXX' : null)
    let effectiveUserRate = userRate
    if (logRange) {
      try {
        const ServiceProvider = require('../models/ServiceProvider')
        const sp = await ServiceProvider.findOne({ 'ranges.range': logRange }).lean()
        const slot = sp?.ranges?.find(r => r.range === logRange)
        if (slot && slot.pricePerOtp != null && slot.pricePerOtp > 0) {
          effectiveUserRate = slot.pricePerOtp
        }
      } catch {}
    }

    const earnedUser  = effectiveUserRate * (1 - agentComm)
    const earnedAgent = effectiveUserRate * agentComm

    // Derive range from number (last 3 digits → XXX)
    const derivedRange = number && number.length >= 4
      ? number.slice(0, -3) + 'XXX'
      : (log.range || null)

    // Normalize sender: use provided sender, fall back to service name
    const normalizedSender = (sender && String(sender).trim()) || service || log.service || null

    await OTPLogs.update(log._id || log.id, {
      status: 'success', otp,
      sender: normalizedSender,
      range:  derivedRange || log.range,
      message:    `Your ${service || log.service} code is: ${otp}`,
      resolvedAt: new Date(), earnedUser, earnedAgent,
    })
    // Propagate OTP status update to secondary DBs
    propagateToSecondary('otplogs', { userId: log.userId, number }, 'updateOne', { $set: { status: 'success', otp, resolvedAt: new Date(), earnedUser, earnedAgent } }).catch(() => {})

    // Credit user balance + success tracking (otpCount already incremented at allocate)
    const updatedUser = await Users.increment(log.userId, { balance: earnedUser, totalEarned: earnedUser })
    console.log(`✓ Balance updated for user ${log.userId}: +${earnedUser} → total: ${updatedUser?.balance}`)

    // Credit agent balance + commission tracking
    if (log.agentId) {
      const updatedAgent = await Agents.increment(log.agentId, { balance: earnedAgent, totalEarned: earnedAgent, totalCommission: earnedAgent })
      console.log(`✓ Agent commission for ${log.agentId}: +${earnedAgent} → total: ${updatedAgent?.balance}`)
    }

    // Update range success count for auto-ranking
    if (derivedRange || log.range) {
      const rangeToUpdate = derivedRange || log.range
      try {
        const ServiceProvider = require('../models/ServiceProvider')
        await ServiceProvider.findOneAndUpdate(
          { 'ranges.range': rangeToUpdate },
          { $inc: { 'ranges.$.successCount': 1 } }
        )
      } catch {}
    }

    if (global.io) {
      global.io.to(`user_${log.userId}`).emit('otp_received', {
        logId: log._id || log.id, number, otp, service: log.service,
        sender: normalizedSender, earned: earnedUser,
      })
      global.io.to('admin').emit('otp_live', {
        number, otp, service: log.service, country: log.country,
        range: log.range, ts: new Date().toISOString(),
      })
      global.io.to('admin').emit('data_updated', { type: 'otps', userId: String(log.userId) })
      global.io.to('admin').emit('data_updated', { type: 'users', userId: String(log.userId) })
      if (log.agentId) global.io.to(`agent_${log.agentId}`).emit('data_updated', { type: 'otps' })
      global.io.to(`user_${log.userId}`).emit('balance_updated', { balance: (await Users.findById(log.userId))?.balance || 0 })
      if (log.agentId) global.io.to(`agent_${log.agentId}`).emit('balance_updated', { balance: (await Agents.findById(log.agentId))?.balance || 0 })
    }

    res.json({ success: true, message: 'OTP delivered' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/otps/check  (user polls for OTP)
router.get('/check', apiKeyAuth, async (req, res) => {
  try {
    const { number } = req.query
    const userId = String(req.user._id || req.user.id)
    const logs   = await OTPLogs.find({ userId, limit: 10 })
    const log    = logs.find(l => l.number === number)
    if (!log) return res.status(404).json({ message: 'No OTP log found' })
    res.json({ status: log.status, otp: log.otp || null, number: log.number })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/otps/stats  — DB-based stats for the logged-in user (all-time, no time window)
router.get('/stats', protect, async (req, res) => {
  try {
    const OTPLogModel = require('../models/OTPLog')
    const mongoose = require('mongoose')
    const uid = String(req.user._id || req.user.id)
    const oid = mongoose.isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid

    const [totalSuccess, totalFailed, totalPending, revenueAgg, hourlyAgg, topServicesAgg] = await Promise.all([
      OTPLogModel.countDocuments({ userId: oid, status: 'success' }),
      OTPLogModel.countDocuments({ userId: oid, status: 'failed' }),
      OTPLogModel.countDocuments({ userId: oid, status: 'pending' }),
      OTPLogModel.aggregate([
        { $match: { userId: oid, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$earnedUser' } } }
      ]),
      // Hourly traffic for today (UTC calendar day)
      OTPLogModel.aggregate([
        {
          $match: {
            userId: oid, status: 'success',
            createdAt: { $gte: new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z') }
          }
        },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }
      ]),
      OTPLogModel.aggregate([
        { $match: { userId: oid, status: 'success' } },
        { $group: { _id: '$service', count: { $sum: 1 }, revenue: { $sum: '$earnedUser' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ])

    // Build 24-hour bucket array
    const hourBuckets = Array(24).fill(0)
    hourlyAgg.forEach(h => { if (h._id >= 0 && h._id < 24) hourBuckets[h._id] = h.count })

    res.json({
      totalSuccess,
      totalFailed,
      totalPending,
      totalRevenue: revenueAgg[0]?.total || 0,
      hourlyTraffic: hourBuckets,
      topServices: topServicesAgg.map(s => ({
        name: s._id || 'Unknown',
        count: s.count,
        revenue: s.revenue || 0,
      }))
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})


router.get('/daily-report', protect, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '7'), 1), 365)
    const since = new Date(Date.now() - days * 86400000)
    since.setHours(0, 0, 0, 0)

    // Build match: scope by role
    const match = { allocatedAt: { $gte: since } }
    if (req.user.role === 'agent') match.agentId = String(req.user._id || req.user.id)
    if (req.user.role === 'user')  match.userId  = String(req.user._id || req.user.id)

    const OTPLogModel = require('../models/OTPLog')

    // Aggregation: per date, compute allocated (count), success, failed, total earnings
    const grouped = await OTPLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$allocatedAt' },
          },
          allocated: { $sum: 1 },
          success:   { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed:    { $sum: { $cond: [{ $eq: ['$status', 'failed']  }, 1, 0] } },
          pending:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          revenue:   { $sum: { $add: [
            { $cond: [{ $eq: ['$status', 'success'] }, { $ifNull: ['$earnedUser', 0]  }, 0] },
            { $cond: [{ $eq: ['$status', 'success'] }, { $ifNull: ['$earnedAgent', 0] }, 0] },
          ] } },
        },
      },
      { $project: { _id: 0, date: '$_id', allocated: 1, success: 1, failed: 1, pending: 1, revenue: { $round: ['$revenue', 4] } } },
      { $sort: { date: -1 } },
    ])

    // Fill missing dates (so the table shows continuous day range even if no activity)
    const filled = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const map = {}
    for (const r of grouped) map[r.date] = r
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      const existing = map[key]
      filled.push({
        date: key,
        allocated: existing ? existing.allocated : 0,
        success:   existing ? existing.success   : 0,
        failed:    existing ? existing.failed    : 0,
        pending:   existing ? existing.pending   : 0,
        revenue:   existing ? existing.revenue   : 0,
      })
    }

    res.json({ rows: filled, totalAllocated: filled.reduce((s, r) => s + r.allocated, 0),
              totalSuccess: filled.reduce((s, r) => s + r.success, 0),
              totalFailed:  filled.reduce((s, r) => s + r.failed, 0),
              totalRevenue: +filled.reduce((s, r) => s + r.revenue, 0).toFixed(4) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/otps/sender-ranges  — unique sender+range pairs with OTP counts
// Scoped by user (or agent's users) — used by SenderRange page
router.get('/sender-ranges', protect, async (req, res) => {
  try {
    const OTPLogModel = require('../models/OTPLog')
    const mongoose    = require('mongoose')

    // Build match filter scoped to the requesting user/agent
    const match = {}
    if (req.user.role === 'user') {
      const uid = String(req.user._id || req.user.id)
      match.userId = mongoose.isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid
    }
    if (req.user.role === 'agent') {
      const aid = String(req.user._id || req.user.id)
      match.agentId = mongoose.isValidObjectId(aid) ? new mongoose.Types.ObjectId(aid) : aid
    }

    const rows = await OTPLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            // Use sender if available, fall back to service name
            sender: { $ifNull: ['$sender', { $ifNull: ['$service', 'UNKNOWN'] }] },
            // Derive range: last 3 digits → XXX
            range: {
              $ifNull: [
                '$range',
                {
                  $concat: [
                    { $substr: ['$number', 0, { $subtract: [{ $strLenCP: '$number' }, 3] }] },
                    'XXX'
                  ]
                }
              ]
            }
          },
          // OTP count = only success + failed (resolved OTPs), not pending
          count:         { $sum: { $cond: [{ $in: ['$status', ['success', 'failed']] }, 1, 0] } },
          lastSeen:      { $max: '$createdAt' },
          successCount:  { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          services:      { $addToSet: '$service' },
        }
      },
      // Only show ranges that have at least 1 resolved OTP
      { $match: { count: { $gt: 0 } } },
      { $sort: { count: -1 } },
      { $limit: 500 },
      {
        $project: {
          _id: 0,
          senderId:     '$_id.sender',
          range:        '$_id.range',
          count:        1,
          successCount: 1,
          lastSeen:     1,
          services:     1,
        }
      }
    ])

    res.json({ rows })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
