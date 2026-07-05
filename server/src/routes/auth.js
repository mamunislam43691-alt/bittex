const router = require('express').Router()
const jwt    = require('jsonwebtoken')
const {
  findAnyByEmail, compareAnyPassword, getModel,
  Admins, Agents, Users,
} = require('../db')
const { protect } = require('../middleware/auth')

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' })

/** Normalize email: strip dots from local part for Gmail-like providers */
function normalizeEmail(email) {
  if (!email) return ''
  const [local, domain] = email.toLowerCase().trim().split('@')
  if (!domain) return email.toLowerCase().trim()
  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    return local.replace(/\./g, '') + '@' + domain
  }
  return email.toLowerCase().trim()
}

function getBrowser(ua = '') {
  if (ua.includes('Chrome Mobile')) return 'Chrome Mobile'
  if (ua.includes('Chrome'))  return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  if (ua.includes('Edge'))    return 'Edge'
  return 'Unknown'
}

/* ── POST /api/auth/register ── (public — creates user role only) */
router.post('/register', async (req, res) => {
  try {
    // Check if registration is enabled in DB settings
    try {
      const Settings = require('../models/Settings')
      const platformSetting = await Settings.findOne({ key: 'platform' }).lean()
      if (platformSetting?.value?.registrationEnabled === false) {
        return res.status(403).json({ message: 'Registration is currently disabled.' })
      }
      // Check registration time window
      const regSetting = await Settings.findOne({ key: 'registration' }).lean()
      if (regSetting?.value) {
        const { startTime, endTime } = regSetting.value
        if (startTime && endTime) {
          const now = Date.now()
          const start = new Date(startTime).getTime()
          const end = new Date(endTime).getTime()
          if (now < start || now > end) {
            return res.status(403).json({ message: 'Registration is currently outside the allowed time window.' })
          }
        }
      }
    } catch {} // Settings check failure → allow registration

    const { username, email, phone, password, agentEmail,
            firstName, lastName, country, city } = req.body
    if (!username || !email || !password)
      return res.status(400).json({ message: 'Username, email and password are required' })

    // Normalize email for consistent storage
    const normalizedEmail = normalizeEmail(email)
    const normalizedAgentEmail = normalizeEmail(agentEmail)

    // Check uniqueness across ALL collections
    const existing = await findAnyByEmail(normalizedEmail)
    if (existing) return res.status(400).json({ message: 'Email already registered' })

    const byU = await Users.findByUsername(username)
    if (byU)  return res.status(400).json({ message: 'Username already taken' })

    // Find agent by email and validate
    let agentId = null
    if (normalizedAgentEmail) {
      const agent = await Agents.findByEmail(normalizedAgentEmail)
      if (!agent) return res.status(400).json({ message: 'Agent not found. Please provide a valid agent email.' })
      if (agent.status === 'banned') return res.status(400).json({ message: 'This agent is currently banned. Please contact support.' })
      agentId = String(agent._id || agent.id)
    }

    const user = await Users.create({
      username, email: normalizedEmail, phone: phone || '', password,
      agentEmail: normalizedAgentEmail,
      agentId:    agentId,
      status: 'pending',
      firstName: firstName || '', lastName: lastName || '',
      country: country || '', city: city || '',
      profileComplete: false,
    })
    const token = signToken(user._id || user.id)
    res.status(201).json({ token, user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    // Search across admins → agents → users
    const normalizedLoginEmail = normalizeEmail(email)
    const account = await findAnyByEmail(normalizedLoginEmail)
    if (!account) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await compareAnyPassword(account, password)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    if (account.status === 'banned')    return res.status(403).json({ message: 'Account banned' })
    if (account.status === 'suspended') return res.status(403).json({ message: 'Account suspended' })
    if (account.status === 'inactive')  return res.status(403).json({ message: 'Account deactivated. Contact admin.' })
    // Block pending regular users only (admins/agents never have pending status by design)
    if (account.status === 'pending' && account.profileComplete === true
        && !['admin','superadmin','moderator','support','agent'].includes(account.role)) {
      return res.status(403).json({ message: 'Account pending activation. Contact your agent.' })
    }

    // Check maintenance mode (skip for admins)
    if (!['admin', 'superadmin', 'moderator', 'support'].includes(account.role)) {
      try {
        const Settings = require('../models/Settings')
        const maintSetting = await Settings.findOne({ key: 'platform' }).lean()
        if (maintSetting?.value?.maintenanceMode) {
          const msgSetting = await Settings.findOne({ key: 'maintenance' }).lean()
          const msg = msgSetting?.value?.message || 'System is under maintenance. Please try again later.'
          return res.status(503).json({ message: msg })
        }
      } catch {}
    }

    // Track session
    const ip  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'Unknown'
    const ua  = req.headers['user-agent'] || ''
    const sessions = account.sessions || []
    const existing = sessions.find(s => s.ip === ip)
    if (!existing) {
      sessions.push({ ip, device: ua.slice(0, 120), browser: getBrowser(ua), loginAt: new Date() })
      if (sessions.length > 10) sessions.shift()
    } else {
      existing.loginAt = new Date()
    }

    // Update last login in correct collection
    const col = account._collection
    const id  = account._id || account.id
    if (col === 'admins') {
      const updates = { lastLogin: new Date(), sessions }
      if (!account.permissions || account.permissions.length === 0) {
        const { DEFAULT_PERMISSIONS } = require('../models/Admin')
        updates.permissions = DEFAULT_PERMISSIONS[account.role] || DEFAULT_PERMISSIONS['admin']
      }
      await Admins.update(id, updates)
      account.permissions = updates.permissions || account.permissions
    }
    else if (col === 'agents')  await Agents.update(id, { lastLogin: new Date(), sessions })
    else                        await Users.update(id,  { lastLogin: new Date(), sessions })

    const token = signToken(id)
    const { password: _, _collection: __, ...safeAccount } = account
    res.json({ token, user: { ...safeAccount, id: String(id) } })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── GET /api/auth/me ── */
router.get('/me', protect, async (req, res) => {
  if (req.user._collection === 'admins' && (!req.user.permissions || req.user.permissions.length === 0)) {
    const { DEFAULT_PERMISSIONS } = require('../models/Admin')
    const def = DEFAULT_PERMISSIONS[req.user.role] || DEFAULT_PERMISSIONS['admin']
    await Admins.update(req.user._id || req.user.id, { permissions: def })
    req.user.permissions = def
  }

  // For users: always load fresh balance + otpCount from DB + OTPLog sync
  if (req.user.role === 'user') {
    try {
      const uid = String(req.user._id || req.user.id)
      const OTPLogModel  = require('../models/OTPLog')
      const Withdrawal   = require('../models/Withdrawal')
      const mongoose     = require('mongoose')

      const total   = await OTPLogModel.countDocuments({ userId: uid })
      const success = await OTPLogModel.countDocuments({ userId: uid, status: 'success' })
      const oid = mongoose.isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid

      const [earnAgg, wdAgg] = await Promise.all([
        OTPLogModel.aggregate([
          { $match: { userId: oid, status: 'success' } },
          { $group: { _id: null, earned: { $sum: '$earnedUser' } } }
        ]),
        Withdrawal.aggregate([
          { $match: { userId: uid, status: { $in: ['approved', 'pending'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ])

      const totalEarned   = earnAgg[0]?.earned || 0
      const totalWithdrawn = wdAgg[0]?.total   || 0
      // Balance = earned minus what's been approved/pending withdrawal
      const balance = Math.max(0, totalEarned - totalWithdrawn)
      const rate    = total > 0 ? Math.round((success / total) * 100) : 0

      if (total > 0 || totalEarned > 0) {
        const updates = { otpCount: total, successRate: rate, totalEarned, balance }
        await Users.update(uid, updates)
        req.user = { ...req.user, ...updates }
      }
    } catch (e) {
      console.error('Balance sync error:', e.message)
    }
  }

  res.json({ user: req.user })
})

/* ── POST /api/auth/check-username ── (public — check username availability) */
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body
    if (!username || username.length < 3) {
      return res.json({ available: false, message: 'Username must be at least 3 characters' })
    }
    // Only allow alphanumeric + underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.json({ available: false, message: 'Only letters, numbers and underscore allowed' })
    }
    const existing = await Users.findByUsername(username.toLowerCase())
    if (existing) {
      return res.json({ available: false, message: 'Username already taken' })
    }
    res.json({ available: true })
  } catch (err) { res.status(500).json({ available: false, message: err.message }) }
})

/* ── POST /api/auth/check-agent ── (public — check if agent exists) */
router.post('/check-agent', async (req, res) => {
  try {
    const { agentEmail } = req.body
    if (!agentEmail) return res.status(400).json({ valid: false, message: 'Agent email is required' })

    const normalized = normalizeEmail(agentEmail)
    const agent = await Agents.findByEmail(normalized)
    if (!agent) return res.json({ valid: false, message: 'No agent found with this email. Please ask your agent for the correct email.' })
    if (agent.status === 'banned') return res.json({ valid: false, message: 'This agent is currently banned.' })
    res.json({ valid: true, name: agent.username || agent.firstName || '', telegram: agent.telegram || '' })
  } catch (err) { res.status(500).json({ valid: false, message: err.message }) }
})

/* ── POST /api/auth/logout ── */
router.post('/logout', protect, (req, res) => {
  res.json({ message: 'Logged out' })
})

/* ── POST /api/auth/recover ── (public — recover account using recovery code) */
router.post('/recover', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ message: 'Recovery code is required' })

    // Find user with matching recovery code
    const user = await Users.findOne({ recoveryCode: code })
    if (!user) return res.status(404).json({ message: 'Invalid recovery code' })

    // Clear recovery code after use
    await Users.update(user._id || user.id, { recoveryCode: null })

    res.json({ message: 'Account recovered successfully' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── POST /api/auth/change-password ── */
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords required' })
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' })

    const account = await findAnyByEmail(req.user.email)
    if (!account) return res.status(404).json({ message: 'Account not found' })

    const valid = await compareAnyPassword(account, currentPassword)
    if (!valid) return res.status(401).json({ message: 'Current password incorrect' })

    const col = account._collection
    const id  = account._id || account.id
    if (col === 'admins')      await Admins.update(id, { password: newPassword })
    else if (col === 'agents') await Agents.update(id, { password: newPassword })
    else                       await Users.update(id,  { password: newPassword })

    res.json({ message: 'Password changed successfully' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
