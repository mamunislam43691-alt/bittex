const router = require('express').Router()
const { Admins, Agents, Users, OTPLogs, Withdrawals, Announcements, NewsPosts, SupportTickets, normalizeEmail } = require('../db')
const { protect, authorize, requirePermission } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')
const { DEFAULT_PERMISSIONS, ALL_PERMISSIONS } = require('../models/Admin')

const adminOnly = [protect, authorize('admin','superadmin')]
const staffOnly = [protect, authorize('admin','superadmin','moderator','support')]

/* ── Dashboard Stats ── */
router.get('/stats', ...staffOnly, async (req, res) => {
  const MAX_RETRIES = 2
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ServiceProvider = require('../models/ServiceProvider')
      const [totalUsers, activeUsers, totalAgents, activeAgents,
             successOTPs, failOTPs, pendingOTPs, pendingW] = await Promise.all([
        Users.countWhere({}),
        Users.countWhere({ status: 'active' }),
        Agents.countWhere({}),
        Agents.countWhere({ status: 'active' }),
        OTPLogs.countWhere({ status: 'success' }),
        OTPLogs.countWhere({ status: 'failed' }),
        OTPLogs.countWhere({ status: 'pending' }),
        Withdrawals.countWhere({ status: 'pending' }),
      ])

      // Total numbers used across all users + agents (from OTPLogs — unique or total allocated)
      const totalNumbersUsed = await require('../models/OTPLog').countDocuments({})

      // Total earnings = user earnings + agent commission combined
      const earningsAgg = await require('../models/OTPLog').aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, userEarnings: { $sum: '$earnedUser' }, agentEarnings: { $sum: '$earnedAgent' } } }
      ])
      const userEarnings  = earningsAgg[0]?.userEarnings  || 0
      const agentEarnings = earningsAgg[0]?.agentEarnings || 0
      const totalEarnings = userEarnings + agentEarnings

      const pendingWds  = await Withdrawals.find({ status: 'pending' })
      const pendingAmt  = pendingWds.reduce((s, w) => s + (w.amount || 0), 0)

      return res.json({
        totalUsers, activeUsers, deactiveUsers: totalUsers - activeUsers,
        totalAgents, activeAgents, deactiveAgents: totalAgents - activeAgents,
        totalNumbersUsed,
        totalEarnings:   totalEarnings.toFixed(2),
        userEarnings:    userEarnings.toFixed(2),
        agentEarnings:   agentEarnings.toFixed(2),
        successOTPs, failOTPs, pendingOTPs,
        totalOTPs: successOTPs + failOTPs + pendingOTPs,
        avgSuccessRate: (successOTPs + failOTPs) > 0
          ? ((successOTPs / (successOTPs + failOTPs)) * 100).toFixed(1) : 0,
        pendingWithdrawals: pendingW,
        pendingWithdrawalAmount: pendingAmt.toFixed(2),
        // backward compat aliases
        totalRevenue: userEarnings.toFixed(2),
        totalNumbers: totalNumbersUsed,
      })
    } catch (err) {
      console.error(`Dashboard stats attempt ${attempt + 1} failed:`, err.message)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
      return res.status(500).json({ message: err.message })
    }
  }
})

/* ── Announcements ── */
router.get('/announcements', protect, requirePermission('announcement_view'), async (req, res) => {
  try {
    const announcements = await Announcements.findAll()
    res.json({ announcements })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/announcements', ...adminOnly, requirePermission('announcement'), async (req, res) => {
  try {
    const ann = await Announcements.create({ ...req.body, createdBy: req.user.id })
    // Propagate to secondary DBs
    propagateToSecondary('announcements', { title: req.body.title, createdBy: req.user.id }, 'insertOne', {
      ...req.body, createdBy: req.user.id, createdAt: new Date()
    }).catch(() => {})
    if (global.io) global.io.emit('new_announcement', ann)
    res.status(201).json({ announcement: ann })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/announcements/:id', ...adminOnly, requirePermission('announcement'), async (req, res) => {
  try {
    const ann = await Announcements.update(req.params.id, req.body)
    if (global.io) global.io.emit('data_updated', { type: 'announcements' })
    res.json({ announcement: ann })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/announcements/:id', ...adminOnly, requirePermission('announcement'), async (req, res) => {
  try {
    await Announcements.delete(req.params.id)
    if (global.io) global.io.emit('data_updated', { type: 'announcements' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── News Feed ── */
router.get('/newsfeed', protect, requirePermission('newsfeed_view'), async (req, res) => {
  try {
    const posts = await NewsPosts.findAll()
    res.json({ posts })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/newsfeed', ...adminOnly, requirePermission('newsfeed'), async (req, res) => {
  try {
    const post = await NewsPosts.create({ ...req.body, createdBy: req.user.id })
    // Propagate to secondary DBs
    propagateToSecondary('newsposts', { title: req.body.title, createdBy: req.user.id }, 'insertOne', {
      ...req.body, createdBy: req.user.id, createdAt: new Date()
    }).catch(() => {})
    if (global.io) global.io.emit('data_updated', { type: 'newsfeed' })
    res.status(201).json({ post })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/newsfeed/:id', ...adminOnly, requirePermission('newsfeed'), async (req, res) => {
  try {
    const post = await NewsPosts.update(req.params.id, req.body)
    if (global.io) global.io.emit('data_updated', { type: 'newsfeed' })
    res.json({ post })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/newsfeed/:id', ...adminOnly, requirePermission('newsfeed'), async (req, res) => {
  try {
    await NewsPosts.delete(req.params.id)
    if (global.io) global.io.emit('data_updated', { type: 'newsfeed' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Support Tickets ── */
router.get('/support', ...staffOnly, requirePermission('ticket_view'), async (req, res) => {
  try {
    const tickets = await SupportTickets.find()
    res.json({ tickets })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/support/:id', ...staffOnly, requirePermission('ticket_view'), async (req, res) => {
  try {
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    res.json({ ticket })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/support/:id/reply', ...staffOnly, requirePermission('ticket_manage'), async (req, res) => {
  try {
    const { text, image } = req.body
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    const msg = { from: 'admin', senderId: req.user._id, text, image, time: new Date() }
    const messages = [...(ticket.messages || []), msg]
    const updated = await SupportTickets.update(req.params.id, { messages, status: 'replaced' })
    if (global.io) {
      global.io.to(`user_${ticket.userId}`).emit('ticket_reply', { ticketId: String(ticket._id), msg })
      global.io.emit('data_updated', { type: 'support' })
    }
    res.json({ ticket: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/support/:id/close', ...staffOnly, requirePermission('ticket_manage'), async (req, res) => {
  try {
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    // Mark closed — preserve history
    const updated = await SupportTickets.update(req.params.id, { status: 'closed' })
    if (global.io) {
      global.io.to(`user_${ticket.userId}`).emit('ticket_closed', { ticketId: String(ticket._id) })
      global.io.emit('data_updated', { type: 'support' })
    }
    res.json({ ticket: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Agents ── */
router.get('/agents', ...staffOnly, requirePermission('agent_view'), async (req, res) => {
  try {
    const agents = await Agents.findAll()
    res.json({ agents })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/agents', ...adminOnly, requirePermission('agent_manage'), async (req, res) => {
  try {
    const { username, email, phone, password, commission,
            firstName, lastName, country, city, telegram,
            bio, birthDate, timezone, address, apiEnabled } = req.body
    if (!username || !email)
      return res.status(400).json({ message: 'Username and email are required' })

    const { findAnyByEmail, normalizeEmail } = require('../db')
    const normalizedEmail = normalizeEmail(email)
    const existing = await findAnyByEmail(normalizedEmail)
    if (existing) return res.status(400).json({ message: 'Email already registered' })

    const byUsername = await Agents.findByUsername(username)
    if (byUsername) return res.status(400).json({ message: 'Username already taken' })

    const agent = await Agents.create({
      username, email: normalizedEmail, phone: phone || '',
      password: password || 'Agent@123456',
      commission: commission || 15, status: 'active',
      firstName: firstName || '', lastName: lastName || '',
      country: country || '', city: city || '',
      telegram: telegram || '', bio: bio || '',
      birthDate: birthDate || '', timezone: timezone || '',
      address: address || '',
      apiEnabled: apiEnabled != null ? apiEnabled : true,
    })
    if (global.io) global.io.emit('data_updated', { type: 'agents' })
    res.status(201).json({ agent })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/agents/:id', ...adminOnly, requirePermission('agent_manage'), async (req, res) => {
  try {
    const agent = await Agents.update(req.params.id, req.body)
    if (global.io) {
      global.io.emit('data_updated', { type: 'agents' })
      // Notify the agent themselves so they can refresh their own profile
      global.io.to(`agent_${req.params.id}`).emit('data_updated', { type: 'agents', userId: req.params.id })
    }
    res.json({ agent })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Transfer users + Delete agent ── */
router.post('/agents/:id/transfer-and-delete', ...adminOnly, requirePermission('agent_manage'), async (req, res) => {
  try {
    const { targetAgentId } = req.body
    if (!targetAgentId) return res.status(400).json({ message: 'Target agent ID required' })

    const agent = await Agents.findById(req.params.id)
    if (!agent) return res.status(404).json({ message: 'Agent not found' })

    const targetAgent = await Agents.findById(targetAgentId)
    if (!targetAgent) return res.status(404).json({ message: 'Target agent not found' })

    // Transfer all users from this agent to target agent
    const agentEmail = normalizeEmail(agent.email || '')
    const targetEmail = normalizeEmail(targetAgent.email || '')
    const agentIdStr = String(agent._id || agent.id)
    const targetIdStr = String(targetAgent._id || targetAgent.id)

    const users = await Users.findAll({})
    const agentUsers = users.filter(u =>
      String(u.agentId) === agentIdStr || normalizeEmail(u.agentEmail || '') === agentEmail
    )

    let transferred = 0
    for (const u of agentUsers) {
      await Users.update(String(u._id || u.id), {
        agentId: targetIdStr,
        agentEmail: targetEmail,
      })
      // Propagate to secondary DBs
      propagateToSecondary('users', { email: u.email }, 'updateOne', { $set: { agentId: targetIdStr, agentEmail: targetEmail } }).catch(() => {})
      transferred++
    }

    // Delete the agent
    await Agents.delete(req.params.id)

    if (global.io) {
      global.io.emit('data_updated', { type: 'agents' })
      global.io.emit('data_updated', { type: 'users' })
    }

    res.json({
      message: `Transferred ${transferred} users to ${targetAgent.username} and deleted ${agent.username}`,
      transferred, deletedAgent: agent.username, targetAgent: targetAgent.username,
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Delete agent + all their users ── */
router.post('/agents/:id/delete-with-users', ...adminOnly, requirePermission('agent_manage'), async (req, res) => {
  try {
    const OTPLog      = require('../models/OTPLog')
    const Withdrawal  = require('../models/Withdrawal')
    const SupportTicket = require('../models/SupportTicket')

    const agent = await Agents.findById(req.params.id)
    if (!agent) return res.status(404).json({ message: 'Agent not found' })

    const agentEmail = normalizeEmail(agent.email || '')
    const agentIdStr = String(agent._id || agent.id)

    // Find all users belonging to this agent
    const users = await Users.findAll({})
    const agentUsers = users.filter(u =>
      String(u.agentId) === agentIdStr || normalizeEmail(u.agentEmail || '') === agentEmail
    )
    const userIds = agentUsers.map(u => String(u._id || u.id))

    // Delete users + related data
    if (userIds.length > 0) {
      await Promise.all([
        OTPLog.deleteMany({ userId: { $in: userIds } }),
        Withdrawal.deleteMany({ userId: { $in: userIds } }),
        SupportTicket.deleteMany({ userId: { $in: userIds } }),
      ])
      for (const uid of userIds) {
        await Users.delete(uid)
      }
    }

    // Delete the agent
    await Agents.delete(req.params.id)

    if (global.io) {
      global.io.emit('data_updated', { type: 'agents' })
      global.io.emit('data_updated', { type: 'users' })
    }

    res.json({
      message: `Deleted agent ${agent.username} and ${agentUsers.length} users`,
      deletedAgent: agent.username, deletedUsers: agentUsers.length,
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/agents/:id', ...adminOnly, requirePermission('agent_manage'), async (req, res) => {
  try {
    await Agents.delete(req.params.id)
    if (global.io) global.io.emit('data_updated', { type: 'agents' })
    res.json({ message: 'Agent deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Staff (admin/moderator/support) ── */
router.get('/staff', ...adminOnly, requirePermission('role_manage'), async (req, res) => {
  try {
    const staff = await Admins.findAll()
    res.json({ staff })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/staff', ...adminOnly, requirePermission('role_manage'), async (req, res) => {
  try {
    const { username, email, phone, password, role, firstName, lastName, permissions } = req.body
    if (!username || !email)
      return res.status(400).json({ message: 'Username and email are required' })

    const STAFF_ROLES = ['admin', 'moderator', 'support']
    if (!STAFF_ROLES.includes(role))
      return res.status(400).json({ message: 'Invalid staff role' })

    if (role === 'admin' && req.user.role !== 'superadmin')
      return res.status(403).json({ message: 'Only superadmin can create admins' })

    const { findAnyByEmail } = require('../db')
    const existing = await findAnyByEmail(email)
    if (existing) return res.status(400).json({ message: 'Email already registered' })

    const byUsername = await Admins.findByUsername(username)
    if (byUsername) return res.status(400).json({ message: 'Username already taken' })

    const staffPermissions = (permissions && Array.isArray(permissions) && permissions.length > 0)
      ? permissions.filter(p => ALL_PERMISSIONS.includes(p))
      : DEFAULT_PERMISSIONS[role] || []

    const staff = await Admins.create({
      username, email, phone: phone || '',
      password: password || 'Admin@123456',
      role, permissions: staffPermissions, status: 'active',
      firstName: firstName || '', lastName: lastName || '',
    })
    if (global.io) global.io.emit('data_updated', { type: 'staff' })
    res.status(201).json({ user: staff })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/staff/:id', ...adminOnly, requirePermission('role_manage'), async (req, res) => {
  try {
    const { role, status, firstName, lastName, phone, permissions } = req.body
    const updates = {}
    if (role !== undefined) updates.role = role
    if (status !== undefined) updates.status = status
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName
    if (phone !== undefined) updates.phone = phone
    if (permissions !== undefined && Array.isArray(permissions)) {
      updates.permissions = permissions.filter(p => ALL_PERMISSIONS.includes(p))
    }

    const updated = await Admins.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ message: 'Staff not found' })
    if (global.io) global.io.emit('data_updated', { type: 'staff' })
    res.json({ user: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/staff/:id', ...adminOnly, requirePermission('role_manage'), async (req, res) => {
  try {
    if (req.params.id === String(req.user._id || req.user.id))
      return res.status(400).json({ message: 'Cannot delete yourself' })
    await Admins.delete(req.params.id)
    if (global.io) global.io.emit('data_updated', { type: 'staff' })
    res.json({ message: 'Staff deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Permissions metadata ── */
router.get('/permissions', ...adminOnly, requirePermission('role_manage'), async (req, res) => {
  try {
    const Settings = require('../models/Settings')
    const setting = await Settings.findOne({ key: 'rolePermissions' }).lean()
    const customDefaults = setting?.value || {}
    const merged = {}
    for (const r of Object.keys(DEFAULT_PERMISSIONS)) {
      merged[r] = Array.isArray(customDefaults[r]) ? customDefaults[r] : DEFAULT_PERMISSIONS[r]
    }
    res.json({ permissions: ALL_PERMISSIONS, defaults: merged })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Update role default permissions ── */
router.put('/permissions/:role', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { role } = req.params
    const { permissions } = req.body
    if (!['superadmin','admin','moderator','support'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'permissions must be an array' })
    }
    const valid = permissions.filter(p => ALL_PERMISSIONS.includes(p))
    const Settings = require('../models/Settings')
    await Settings.findOneAndUpdate(
      { key: 'rolePermissions' },
      { $set: { [`value.${role}`]: valid } },
      { upsert: true, new: true }
    )
    res.json({ message: 'Role permissions updated', role, permissions: valid })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── OTP Log Purge (Clear ALL OTP logs) ── */
router.delete('/otps/purge', ...adminOnly, requirePermission('otp_monitor'), async (req, res) => {
  try {
    const OTPLog = require('../models/OTPLog')
    const result = await OTPLog.deleteMany({})
    res.json({ message: `Deleted ${result.deletedCount} OTP logs` })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Analytics ── */
router.get('/analytics/revenue', ...staffOnly, requirePermission('analytics'), async (req, res) => {
  try {
    const days  = parseInt(req.query.days || '30')
    const since = new Date(Date.now() - days * 86400000)

    const data = await require('../models/OTPLog').aggregate([
      { $match: { status: 'success', createdAt: { $gte: since } } },
      {
        $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $add: ['$earnedUser', '$earnedAgent'] } },
          otps:    { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: '$_id', revenue: 1, otps: 1 } },
      { $sort: { date: 1 } },
    ])

    res.json({ data })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Analytics: Country distribution (aggregated, no 2000-user fetch) ── */
router.get('/analytics/countries', ...staffOnly, requirePermission('analytics'), async (req, res) => {
  try {
    const { User } = require('../db')
    const result = await User.aggregate([
      { $match: { country: { $exists: true, $ne: '' } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ])
    const total = result.reduce((s, r) => s + r.count, 0)
    const countries = result.map(r => ({
      name: r._id,
      value: total > 0 ? Math.round((r.count / total) * 100) : 0,
      count: r.count,
    }))
    res.json({ countries })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* ── Wipe Database (superadmin only) ── */
router.post('/wipe', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { Admin, Agent, User } = require('../db')
    const OTPLog          = require('../models/OTPLog')
    const Withdrawal      = require('../models/Withdrawal')
    const ServiceProvider = require('../models/ServiceProvider')
    const Announcement    = require('../models/Announcement')
    const SupportTicket   = require('../models/SupportTicket')
    const NewsPost        = require('../models/NewsPost')

    await Promise.all([
      OTPLog.deleteMany({}),
      Withdrawal.deleteMany({}),
      ServiceProvider.deleteMany({}),
      Announcement.deleteMany({}),
      SupportTicket.deleteMany({}),
      NewsPost.deleteMany({}),
      User.deleteMany({}),
      Agent.deleteMany({}),
      // Keep current superadmin
      Admin.deleteMany({ _id: { $ne: req.user._id || req.user.id } }),
    ])

    res.json({ success: true, message: 'Database wiped. All data deleted except your admin account.' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── Export Database ── */
router.get('/export', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { Admin, Agent, User } = require('../db')
    const OTPLog          = require('../models/OTPLog')
    const Withdrawal      = require('../models/Withdrawal')
    const ServiceProvider = require('../models/ServiceProvider')
    const Announcement    = require('../models/Announcement')
    const SupportTicket   = require('../models/SupportTicket')
    const NewsPost        = require('../models/NewsPost')

    const [admins, agents, users, otps, withdrawals,
           providers, announcements, tickets, newsPosts] = await Promise.all([
      Admin.find({}).lean(),
      Agent.find({}).lean(),
      User.find({}).lean(),
      OTPLog.find({}).lean(),
      Withdrawal.find({}).lean(),
      ServiceProvider.find({}).lean(),
      Announcement.find({}).lean(),
      SupportTicket.find({}).lean(),
      NewsPost.find({}).lean(),
    ])

    const strip = arr => arr.map(u => { const { password, ...r } = u; return r })

    const exportData = {
      exportedAt: new Date().toISOString(), version: '2.0',
      collections: {
        admins: strip(admins), agents: strip(agents), users: strip(users),
        otpLogs: otps, withdrawals, serviceProviders: providers,
        announcements, supportTickets: tickets, newsPosts,
      },
      summary: {
        admins: admins.length, agents: agents.length, users: users.length,
        otps: otps.length, withdrawals: withdrawals.length,
      },
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="bittxsms_backup_${Date.now()}.json"`)
    res.json(exportData)
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── DB Stats (real) ── */
router.get('/db-stats', ...staffOnly, requirePermission('analytics'), async (req, res) => {
  try {
    const mongoose = require('mongoose')
    const db       = mongoose.connection.db
    const serverStatus = await db.admin().serverStatus().catch(() => null)
    const dbStats      = await db.stats().catch(() => null)
    const { Admin, Agent, User } = require('../db')
    const OTPLog     = require('../models/OTPLog')
    const Withdrawal = require('../models/Withdrawal')

    const [adminCount, agentCount, userCount, otpCount, wdCount] = await Promise.all([
      Admin.countDocuments(), Agent.countDocuments(), User.countDocuments(),
      OTPLog.countDocuments(), Withdrawal.countDocuments(),
    ])

    res.json({
      connections: serverStatus?.connections?.current ?? '—',
      dbSizeMB:    dbStats ? (dbStats.dataSize / 1024 / 1024).toFixed(1) + ' MB' : '—',
      uptime:      serverStatus ? formatUptime(serverStatus.uptime) : '—',
      adminCount, agentCount, userCount,
      otpCount, wdCount,
      queries: otpCount,
    })
  } catch (err) {
    res.json({ connections: '—', dbSizeMB: '—', uptime: '—' })
  }
})

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

/* ── Sync Balances from OTPLog (fixes stale $0.00 balances) ── */
router.post('/sync-balances', ...adminOnly, requirePermission('finance_manage'), async (req, res) => {
  try {
    const mongoose    = require('mongoose')
    const OTPLogModel = require('../models/OTPLog')
    const { User, Agent } = require('../db')

    // Get all users
    const users = await User.find({}).lean()
    let synced = 0

    for (const u of users) {
      const uid = String(u._id)
      const oid = mongoose.isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid
      const agg = await OTPLogModel.aggregate([
        { $match: { userId: oid, status: 'success' } },
        { $group: { _id: null, earned: { $sum: '$earnedUser' }, count: { $sum: 1 } } }
      ])
      if (agg.length > 0 && agg[0].earned > 0) {
        const { earned, count } = agg[0]
        if ((u.balance || 0) < earned || (u.totalEarned || 0) < earned) {
          await User.findByIdAndUpdate(uid, {
            $set: { balance: earned, totalEarned: earned, otpCount: count }
          })
          synced++
        }
      }
    }

    // Get all agents
    const agents = await Agent.find({}).lean()
    for (const a of agents) {
      const aid = String(a._id)
      const oid = mongoose.isValidObjectId(aid) ? new mongoose.Types.ObjectId(aid) : aid
      const agg = await OTPLogModel.aggregate([
        { $match: { agentId: oid, status: 'success' } },
        { $group: { _id: null, earned: { $sum: '$earnedAgent' } } }
      ])
      if (agg.length > 0 && agg[0].earned > 0) {
        const { earned } = agg[0]
        if ((a.balance || 0) < earned) {
          await Agent.findByIdAndUpdate(aid, {
            $set: { balance: earned, totalEarned: earned, totalCommission: earned }
          })
          synced++
        }
      }
    }

    if (global.io) {
      global.io.to('admin').emit('data_updated', { type: 'users' })
      global.io.to('admin').emit('data_updated', { type: 'agents' })
    }
    res.json({ success: true, message: `Synced balances for ${synced} accounts` })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── Reset All Balances ── */
router.post('/reset-balances', ...adminOnly, requirePermission('finance_manage'), async (req, res) => {
  try {
    const { Agent, User } = require('../db')
    const [r1, r2] = await Promise.all([
      Agent.updateMany({}, { $set: { balance: 0, totalEarned: 0 } }),
      User.updateMany({},  { $set: { balance: 0, totalEarned: 0 } }),
    ])
    res.json({ success: true, message: `Reset balances for ${r1.modifiedCount + r2.modifiedCount} accounts` })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── Disable All API Keys ── */
router.post('/disable-api-keys', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const { Agent, User } = require('../db')
    const [r1, r2] = await Promise.all([
      Agent.updateMany({ apiEnabled: true }, { $set: { apiEnabled: false, apiKey: null } }),
      User.updateMany({  apiEnabled: true }, { $set: { apiEnabled: false, apiKey: null } }),
    ])
    res.json({ success: true, message: `Disabled API keys for ${r1.modifiedCount + r2.modifiedCount} accounts` })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── Delete Inactive Users (30 days) ── */
router.delete('/inactive-users', ...adminOnly, requirePermission('user_manage'), async (req, res) => {
  try {
    const { User } = require('../db')
    const since  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const result = await User.deleteMany({
      $or: [
        { lastLogin: { $lt: since } },
        { lastLogin: null, createdAt: { $lt: since } },
      ],
    })
    res.json({ success: true, message: `Deleted ${result.deletedCount} inactive users` })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

/* ── Delete ALL Users (full cleanup — does NOT touch agents) ── */
router.post('/delete-all-users', ...adminOnly, requirePermission('user_manage'), async (req, res) => {
  try {
    const { User, OTPLog, Withdrawal, SupportTicket } = require('../db')

    // Get all user IDs first
    const allUsers = await User.find({}).select('_id')
    const userIds = allUsers.map(u => String(u._id || u.id))

    if (userIds.length === 0) {
      return res.json({ success: true, message: 'No users to delete', deletedUsers: 0 })
    }

    // Delete all related data for each user
    const results = await Promise.all([
      User.deleteMany({}),
      OTPLog.deleteMany({ userId: { $in: userIds } }),
      Withdrawal.deleteMany({ userId: { $in: userIds } }),
      SupportTicket.deleteMany({ userId: { $in: userIds } }),
    ])

    const deletedUsers = results[0].deletedCount

    if (global.io) {
      global.io.emit('data_updated', { type: 'users' })
      global.io.emit('data_updated', { type: 'withdrawals' })
    }

    res.json({
      success: true,
      message: `Deleted ${deletedUsers} users and all their data (OTP logs, withdrawals, support tickets)`,
      deletedUsers,
      deletedOTPs: results[1].deletedCount,
      deletedWithdrawals: results[2].deletedCount,
      deletedTickets: results[3].deletedCount,
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
