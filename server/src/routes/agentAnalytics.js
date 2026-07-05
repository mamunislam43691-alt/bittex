/**
 * agentAnalytics.js — Analytics routes scoped to a single agent.
 *
 * Endpoints:
 *   GET /api/agent-analytics/revenue?days=30  → Daily revenue + OTP volume for THIS agent's users only
 *   GET /api/agent-analytics/countries        → Country breakdown of THIS agent's users only
 */
const router = require('express').Router()
const { protect } = require('../middleware/auth')

function getAgentId(req) {
  return req.user._id || req.user.id
}

/**
 * Convert an agent ID into all the user-lookup shapes we have stored in OTPLog.
 * OTPLogs reference the userId that owns the number, but the user belongs to the
 * agent through `agentId` (and historically through `agentEmail`). We aggregate
 * by listing the agent's users, then matching on `userId`.
 */
async function getAgentUserIds(Agent, User, agentId) {
  // Match by agentId (preferred) OR agentEmail (legacy data)
  const agent = await Agent.findById(agentId).lean()
  const agentEmail = agent?.email || ''
  const byId = await User.findAll({ agentId: agentId })
  let users = byId || []
  if (users.length === 0 && agentEmail) {
    users = await User.findAll({ agentEmail }) || []
  }
  return users.map(u => String(u._id || u.id))
}

/* ── GET /api/agent-analytics/stats ── DB-based summary for this agent ── */
router.get('/stats', protect, async (req, res) => {
  try {
    const { Agent, User } = require('../db')
    const OTPLog = require('../models/OTPLog')
    const mongoose = require('mongoose')
    const agentId = getAgentId(req)

    const userIds = await getAgentUserIds(Agent, User, agentId)

    if (userIds.length === 0) {
      return res.json({
        totalUsers: 0, activeUsers: 0,
        totalOTPs: 0, totalSuccess: 0, totalFailed: 0,
        totalRevenue: 0, agentCommission: 0,
        todayOTPs: 0, todayRevenue: 0,
      })
    }

    const oids = userIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id)
    const todayStart = new Date(Date.now() - 12 * 60 * 60 * 1000)

    const [totalSuccess, totalFailed, todaySuccess, revenueAgg, todayRevenueAgg, agentCommAgg] = await Promise.all([
      OTPLog.countDocuments({ userId: { $in: oids }, status: 'success' }),
      OTPLog.countDocuments({ userId: { $in: oids }, status: 'failed' }),
      OTPLog.countDocuments({ userId: { $in: oids }, status: 'success', createdAt: { $gte: todayStart } }),
      OTPLog.aggregate([
        { $match: { userId: { $in: oids }, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$earnedUser' } } }
      ]),
      OTPLog.aggregate([
        { $match: { userId: { $in: oids }, status: 'success', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$earnedUser' } } }
      ]),
      OTPLog.aggregate([
        { $match: { userId: { $in: oids }, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$earnedAgent' } } }
      ]),
    ])

    // Get user counts from DB
    const allAgentUsers = await User.findAll({ agentId: String(agentId) }) || []
    const activeUsers = allAgentUsers.filter(u => u.status === 'active').length

    res.json({
      totalUsers:      allAgentUsers.length,
      activeUsers,
      totalOTPs:       totalSuccess + totalFailed,
      totalSuccess,
      totalFailed,
      totalRevenue:    revenueAgg[0]?.total || 0,
      agentCommission: agentCommAgg[0]?.total || 0,
      todayOTPs:       todaySuccess,
      todayRevenue:    todayRevenueAgg[0]?.total || 0,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* ── GET /api/agent-analytics/revenue ─────────────────── */
router.get('/revenue', protect, async (req, res) => {
  try {
    const { Agent, User } = require('../db')
    const OTPLog = require('../models/OTPLog')
    const days   = parseInt(req.query.days || '30')
    const since  = new Date(Date.now() - days * 86400000)
    const agentId = getAgentId(req)

    const userIds = await getAgentUserIds(Agent, User, agentId)
    const match   = { createdAt: { $gte: since } }
    if (userIds.length > 0) match.userId = { $in: userIds }
    else match.userId = { $in: ['__none__'] } // agent has no users → empty result

    const data = await OTPLog.aggregate([
      { $match: match },
      {
        $group: {
          _id:       { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue:   { $sum: { $add: ['$earnedUser', '$earnedAgent'] } },
          otps:      { $sum: 1 },
          successes: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, date: '$_id', revenue: 1, otps: 1, successes: 1 } },
      { $sort: { date: 1 } },
    ])

    res.json({ data, agentId })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* ── GET /api/agent-analytics/countries ───────────────── */
router.get('/countries', protect, async (req, res) => {
  try {
    const { Agent, User } = require('../db')
    const agentId   = getAgentId(req)
    const agent     = await Agent.findById(agentId).lean()
    const users     = (await User.findAll({ agentId: agentId })) || []
    const usersByEmail = users.length > 0 ? users : (agent?.email ? (await User.findAll({ agentEmail: agent.email })) : [])

    const counts = {}
    usersByEmail.forEach(u => {
      if (u.country) counts[u.country] = (counts[u.country] || 0) + 1
    })
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const top3 = sorted.slice(0, 3)
    const otherCount = sorted.slice(3).reduce((s, [, c]) => s + c, 0)
    const result = top3.map(([name, count]) => ({
      name, value: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    if (otherCount > 0) result.push({ name: 'Other', value: Math.round((otherCount / total) * 100) })
    res.json({ data: result, total })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
