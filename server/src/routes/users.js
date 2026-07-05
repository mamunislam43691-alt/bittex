const router    = require('express').Router()
const mongoose  = require('mongoose')
const { Users, Agents, findAnyByEmail, OTPLogs } = require('../db')
const { protect, authorize } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

/** Normalize email */
function normalizeEmail(email) {
  if (!email) return ''
  const [local, domain] = email.toLowerCase().trim().split('@')
  if (!domain) return email.toLowerCase().trim()
  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    return local.replace(/\./g, '') + '@' + domain
  }
  return email.toLowerCase().trim()
}

/** Real-time enrich: OTP count + balance sync from OTPLog */
async function enrichUser(u) {
  const uid = String(u._id || u.id)
  let otpCount    = u.otpCount    || 0
  let successRate = u.successRate || 0
  let totalEarned = u.totalEarned || 0
  let balance     = u.balance     || 0
  try {
    const OTPLogModel = require('../models/OTPLog')
    const total   = await OTPLogModel.countDocuments({ userId: uid })
    const success = await OTPLogModel.countDocuments({ userId: uid, status: 'success' })
    const failed  = await OTPLogModel.countDocuments({ userId: uid, status: { $in: ['failed', 'expired', 'timeout'] } })
    if (total > 0) {
      otpCount    = total
      successRate = Math.round((success / total) * 100)
    }
    u.failedOtps = failed
    // Aggregate earnings
    const oid = mongoose.isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid
    const agg = await OTPLogModel.aggregate([
      { $match: { userId: oid, status: 'success' } },
      { $group: { _id: null, earned: { $sum: '$earnedUser' } } }
    ])
    if (agg.length > 0 && agg[0].earned > 0) totalEarned = agg[0].earned
    // Auto-fix stale balance
    if (balance < totalEarned) {
      await Users.update(uid, { balance: totalEarned, totalEarned, otpCount, successRate })
      balance = totalEarned
    }
  } catch {}
  return { ...u, otpCount, successRate, totalEarned, balance, failedOtps: u.failedOtps ?? 0 }
}

/* ── GET /api/users ── */
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'agent') {
      const agentId    = String(req.user._id || req.user.id)
      const agentEmail = normalizeEmail(req.user.email || '')
      const all        = await Users.findAll({})
      const filtered   = all.filter(u =>
        String(u.agentId) === agentId || normalizeEmail(u.agentEmail) === agentEmail
      )
      const agentsMap = {}
      const agentIds  = [...new Set(filtered.map(u => u.agentId).filter(Boolean))]
      for (const aid of agentIds) {
        try { const a = await Agents.findById(aid); if (a) agentsMap[aid] = a } catch {}
      }
      const enriched = await Promise.all(filtered.map(async u => ({
        ...(await enrichUser(u)),
        agentUsername: u.agentId && agentsMap[u.agentId] ? agentsMap[u.agentId].username : '',
      })))
      return res.json({ users: enriched })
    }

    if (!['admin', 'superadmin', 'moderator', 'support'].includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' })

    const users     = await Users.findAll()
    const agentsMap = {}
    const agentIds  = [...new Set(users.map(u => u.agentId).filter(Boolean))]
    for (const aid of agentIds) {
      try { const a = await Agents.findById(aid); if (a) agentsMap[aid] = a } catch {}
    }
    const enriched = await Promise.all(users.map(async u => ({
      ...(await enrichUser(u)),
      agentUsername: u.agentId && agentsMap[u.agentId] ? agentsMap[u.agentId].username : '',
    })))
    res.json({ users: enriched })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── GET /api/users/:id ── */
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await Users.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── POST /api/users ── */
router.post('/', protect, authorize('admin', 'superadmin', 'agent'), async (req, res) => {
  try {
    const { username, email, phone, password, agentId, agentEmail } = req.body
    if (!username || !email)
      return res.status(400).json({ message: 'Username and email are required' })

    const normalizedEmail = normalizeEmail(email)
    const existing = await findAnyByEmail(normalizedEmail)
    if (existing) return res.status(400).json({ message: 'Email already registered' })

    const byUsername = await Users.findByUsername(username)
    if (byUsername) return res.status(400).json({ message: 'Username already taken' })

    const user = await Users.create({
      username, email: normalizedEmail, phone: phone || '',
      password: password || 'Change@123456',
      agentId:    agentId    || (req.user.role === 'agent' ? (req.user._id || req.user.id) : null),
      agentEmail: agentEmail ? normalizeEmail(agentEmail) : (req.user.role === 'agent' ? normalizeEmail(req.user.email) : ''),
      status: 'active',
    })
    if (global.io) {
      global.io.to('admin').emit('user_created', { user })
      if (user.agentId) global.io.to(`agent_${user.agentId}`).emit('user_created', { user })
    }
    propagateToSecondary('users', { email: normalizedEmail }, 'insertOne', {
      username, email: normalizedEmail, phone: phone || '',
      agentId: user.agentId, agentEmail: user.agentEmail, status: 'active',
      createdAt: new Date(), updatedAt: new Date()
    }).catch(() => {})
    res.status(201).json({ user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── PUT /api/users/:id ── */
router.put('/:id', protect, async (req, res) => {
  try {
    const isSelf  = String(req.user._id || req.user.id) === req.params.id
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role)
    const isAgent = req.user.role === 'agent'
    const isStaff = ['moderator', 'support'].includes(req.user.role)

    if (!isSelf && !isAdmin && !isAgent && !isStaff)
      return res.status(403).json({ message: 'Forbidden' })

    if (isAgent) {
      const user = await Users.findById(req.params.id)
      if (!user) return res.status(404).json({ message: 'User not found' })
      if (normalizeEmail(user.agentEmail || '') !== normalizeEmail(req.user.email))
        return res.status(403).json({ message: 'Can only update your own users' })
      const ALLOWED_AGENT = ['status', 'apiEnabled']
      const body = {}
      ALLOWED_AGENT.forEach(k => { if (req.body[k] !== undefined) body[k] = req.body[k] })
      const VALID_STATUSES = ['active', 'pending', 'banned', 'suspended', 'inactive']
      if (body.status && !VALID_STATUSES.includes(body.status))
        return res.status(400).json({ message: 'Invalid status value' })
      const updated = await Users.update(req.params.id, body)
      return res.json({ user: updated })
    }

    if (!isAdmin) {
      delete req.body.role; delete req.body.balance
      delete req.body.apiEnabled; delete req.body.apiKey
    }

    const user = await Users.update(req.params.id, req.body)
    if (!user) return res.status(404).json({ message: 'User not found' })
    propagateToSecondary('users', { email: user.email }, 'updateOne', { $set: req.body }).catch(() => {})
    if (global.io) {
      global.io.to('admin').emit('data_updated', { type: 'users', userId: req.params.id })
      if (user.agentId) global.io.to(`agent_${user.agentId}`).emit('data_updated', { type: 'users', userId: req.params.id })
      global.io.to(`user_${user._id || user.id}`).emit('data_updated', { type: 'users', userId: req.params.id })
    }
    res.json({ user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── DELETE /api/users/:id ── */
router.delete('/:id', protect, async (req, res) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role)
    const isAgent = req.user.role === 'agent'
    if (!isAdmin && !isAgent) return res.status(403).json({ message: 'Forbidden' })

    const user = await Users.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (isAgent && normalizeEmail(user.agentEmail) !== normalizeEmail(req.user.email))
      return res.status(403).json({ message: 'Can only delete your own users' })

    await Users.delete(req.params.id)
    propagateToSecondary('users', { email: user.email }, 'deleteOne', {}).catch(() => {})
    if (global.io) {
      global.io.to('admin').emit('data_updated', { type: 'users' })
      if (user.agentId) global.io.to(`agent_${user.agentId}`).emit('data_updated', { type: 'users' })
    }
    res.json({ message: 'User deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── POST /api/users/:id/api-key ── */
router.post('/:id/api-key', protect, async (req, res) => {
  try {
    // Only the user themselves or admin can generate API key
    const isSelf  = String(req.user._id || req.user.id) === req.params.id
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role)
    const isAgent = req.user.role === 'agent'
    if (!isSelf && !isAdmin && !isAgent)
      return res.status(403).json({ message: 'Forbidden' })

    const apiKey = Users.generateApiKey()
    await Users.update(req.params.id, { apiKey, apiEnabled: true })
    res.json({ apiKey })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── PUT /api/users/:id/commission ── (agent sets per-user commission) */
router.put('/:id/commission', protect, async (req, res) => {
  try {
    if (!['agent', 'admin', 'superadmin'].includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' })

    const user = await Users.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Agent can only update commission for their own users
    if (req.user.role === 'agent') {
      const agentId = String(req.user._id || req.user.id)
      const agentEmail = normalizeEmail(req.user.email || '')
      if (String(user.agentId) !== agentId && normalizeEmail(user.agentEmail || '') !== agentEmail)
        return res.status(403).json({ message: 'Can only update commission for your own users' })
    }

    const { commission } = req.body
    // null = reset to agent default; otherwise clamp between 0-100
    const val = commission === null || commission === undefined
      ? null
      : Math.min(100, Math.max(0, parseFloat(commission)))

    await Users.update(req.params.id, { customCommission: val })
    if (global.io) {
      global.io.to('admin').emit('data_updated', { type: 'users', userId: req.params.id })
      if (user.agentId) global.io.to(`agent_${user.agentId}`).emit('data_updated', { type: 'users' })
    }
    res.json({ success: true, customCommission: val })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── GET /api/users/:id/stats ── */
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const [total, success, failed] = await Promise.all([
      OTPLogs.countWhere({ userId: req.params.id }),
      OTPLogs.countWhere({ userId: req.params.id, status: 'success' }),
      OTPLogs.countWhere({ userId: req.params.id, status: 'failed' }),
    ])
    res.json({ total, success, failed,
      successRate: total ? ((success / total) * 100).toFixed(1) : 0 })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
