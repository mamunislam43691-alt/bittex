/**
 * db.js — Database helpers
 * Collections:
 *   admins     → Admin model (superadmin, admin, moderator, support)
 *   agents     → Agent model
 *   users      → User model
 */
const bcrypt          = require('bcryptjs')
const Admin           = require('./models/Admin')
const Agent           = require('./models/Agent')
const User            = require('./models/User')
const OTPLog          = require('./models/OTPLog')
const Withdrawal      = require('./models/Withdrawal')
const ServiceProvider = require('./models/ServiceProvider')
const Announcement    = require('./models/Announcement')
const SupportTicket   = require('./models/SupportTicket')
const NewsPost        = require('./models/NewsPost')

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

/* ─── UNIFIED ACCOUNT HELPERS ──────────────────────────────── */
// Find any account (admin, agent, or user) by email
async function findAnyByEmail(email) {
  const e = normalizeEmail(email)
  // Use regex for case-insensitive + dot-insensitive match (handles legacy data)
  const admin = await Admin.findOne({ email: { $regex: new RegExp('^' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean()
  if (admin) return { ...admin, _collection: 'admins' }
  const agent = await Agent.findOne({ email: { $regex: new RegExp('^' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean()
  if (agent) return { ...agent, _collection: 'agents' }
  const user = await User.findOne({ email: { $regex: new RegExp('^' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean()
  if (user) return { ...user, _collection: 'users' }
  return null
}

// Find any account by ID
async function findAnyById(id) {
  const admin = await Admin.findById(id).lean()
  if (admin) return { ...admin, _collection: 'admins' }
  const agent = await Agent.findById(id).lean()
  if (agent) return { ...agent, _collection: 'agents' }
  const user = await User.findById(id).lean()
  if (user) return { ...user, _collection: 'users' }
  return null
}

// Get the correct model for a collection name or role
function getModel(roleOrCollection) {
  if (['superadmin','admin','moderator','support','admins'].includes(roleOrCollection)) return Admin
  if (['agent','agents'].includes(roleOrCollection)) return Agent
  return User
}

// Compare password for any account type
async function compareAnyPassword(account, candidate) {
  const Model = getModel(account._collection || account.role)
  const doc   = await Model.findById(account._id || account.id).select('+password')
  if (!doc) return false
  return doc.comparePassword(candidate)
}

/* ─── ADMINS ────────────────────────────────────────────────── */
const Admins = {
  async findById(id)      { return await Admin.findById(id).lean() },
  async findByEmail(email){ return await Admin.findOne({ email: { $regex: new RegExp('^' + normalizeEmail(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean() },
  async findByUsername(u) { return await Admin.findOne({ username: u }).lean() },
  async findAll(filter={}) {
    return await Admin.find(filter).sort({ createdAt: -1 }).lean()
  },
  async create(data) {
    const doc = await Admin.create(data)
    const obj = doc.toObject(); delete obj.password; return obj
  },
  async update(id, updates) {
    const ALLOWED = ['status','role','username','email','phone','firstName','lastName',
                     'photoUrl','profileComplete','lastLogin','sessions','preferences']
    const clean = {}
    for (const k of ALLOWED) { if (updates[k] !== undefined) clean[k] = updates[k] }
    if (updates.password) clean.password = await bcrypt.hash(updates.password, 12)
    return await Admin.findByIdAndUpdate(id, clean, { new: true }).lean()
  },
  async delete(id)        { await Admin.findByIdAndDelete(id) },
  async countWhere(f={})  { return await Admin.countDocuments(f) },
}

/* ─── AGENTS ────────────────────────────────────────────────── */
const Agents = {
  async findById(id)      { return await Agent.findById(id).lean() },
  async findByEmail(email){ return await Agent.findOne({ email: { $regex: new RegExp('^' + normalizeEmail(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean() },
  async findByUsername(u) { return await Agent.findOne({ username: u }).lean() },
  async findByApiKey(key) { return await Agent.findOne({ apiKey: key }).lean() },
  async findAll(filter={}) {
    return await Agent.find(filter).sort({ createdAt: -1 }).lean()
  },
  async create(data) {
    const doc = await Agent.create({ ...data, role: 'agent' })
    const obj = doc.toObject(); delete obj.password; return obj
  },
  async update(id, updates) {
    const ALLOWED = ['status','username','email','phone','commission','balance','totalEarned',
                     'totalCommission','apiEnabled','apiKey','sessions','firstName','lastName','country','city',
                     'photoUrl','telegram','profileComplete','lastLogin','preferences']
    const clean = {}
    for (const k of ALLOWED) { if (updates[k] !== undefined) clean[k] = updates[k] }
    if (updates.password) clean.password = await bcrypt.hash(updates.password, 12)
    return await Agent.findByIdAndUpdate(id, clean, { new: true }).lean()
  },
  async delete(id)        { await Agent.findByIdAndDelete(id) },
  async increment(id, fields) {
    return await Agent.findByIdAndUpdate(id, { $inc: fields }, { new: true }).lean()
  },
  async countWhere(f={})  { return await Agent.countDocuments(f) },
  generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return 'bttx_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  },
}

/* ─── USERS ─────────────────────────────────────────────────── */
const Users = {
  async findById(id)      { return await User.findById(id).lean() },
  async findByEmail(email){ return await User.findOne({ email: { $regex: new RegExp('^' + normalizeEmail(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean() },
  async findByUsername(u) { return await User.findOne({ username: u }).lean() },
  async findByApiKey(key) { return await User.findOne({ apiKey: key }).lean() },
  async findAll(filter={}) {
    const q = { ...filter }
    // Remove role filter since all docs here are users
    delete q.role
    return await User.find(q).sort({ createdAt: -1 }).lean()
  },
  async create(data) {
    const doc = await User.create({ ...data, role: 'user' })
    const obj = doc.toObject(); delete obj.password; return obj
  },
  async update(id, updates) {
    const ALLOWED = ['balance','totalEarned','status','apiEnabled','apiKey','sessions',
                     'lastLogin','otpCount','otpActive','lastOtpAt','username','email',
                     'phone','country','bio','city','birthDate','timezone','address',
                     'telegram','photoUrl','agentId','agentEmail','firstName','lastName',
                     'successRate','profileComplete','twoFALogin','twoFAPayments','savedAddresses',
                     'customCommission']
    const clean = {}
    for (const k of ALLOWED) { if (updates[k] !== undefined) clean[k] = updates[k] }
    if (updates.password) clean.password = await bcrypt.hash(updates.password, 12)
    return await User.findByIdAndUpdate(id, clean, { new: true }).lean()
  },
  async delete(id)        { await User.findByIdAndDelete(id) },
  async increment(id, fields) {
    return await User.findByIdAndUpdate(id, { $inc: fields }, { new: true }).lean()
  },
  async countWhere(f={})  {
    const q = { ...f }; delete q.role
    return await User.countDocuments(q)
  },
  generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return 'bttx_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  },

  // Backward compat: old code calls Users.comparePassword
  async comparePassword(user, candidate) {
    const doc = await User.findById(user.id || user._id).select('+password')
    if (!doc) return false
    return doc.comparePassword(candidate)
  },
}

/* ─── OTP LOGS ──────────────────────────────────────────────── */
const OTPLogs = {
  async findById(id)  { return await OTPLog.findById(id).lean() },
  async find({ userId, agentId, status, limit = 100 } = {}) {
    const q = {}
    if (userId)  q.userId  = userId
    if (agentId) q.agentId = agentId
    if (status)  q.status  = status
    return await OTPLog.find(q).sort({ createdAt: -1 }).limit(parseInt(limit)).lean()
  },
  async findPendingByNumber(number) {
    return await OTPLog.findOne({ number, status: 'pending' }).sort({ createdAt: -1 }).lean()
  },
  async create(data)       { return await OTPLog.create(data) },
  async update(id, updates){ return await OTPLog.findByIdAndUpdate(id, updates, { new: true }).lean() },
  async countWhere(f={})   { return await OTPLog.countDocuments(f) },
  async totalRevenue() {
    const agg = await OTPLog.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: { $add: ['$earnedUser', '$earnedAgent'] } } } },
    ])
    return agg[0]?.total || 0
  },
}

/* ─── WITHDRAWALS ───────────────────────────────────────────── */
const Withdrawals = {
  async findById(id)  { return await Withdrawal.findById(id).lean() },
  async find({ userId, status } = {}) {
    const q = {}
    if (userId) q.userId = userId
    if (status && status !== 'all') q.status = status
    return await Withdrawal.find(q).sort({ createdAt: -1 }).lean()
  },
  async create(data)       { return await Withdrawal.create(data) },
  async update(id, updates){ return await Withdrawal.findByIdAndUpdate(id, updates, { new: true }).lean() },
  async countWhere(f={})   { return await Withdrawal.countDocuments(f) },
  async deleteMany(filter) { return await Withdrawal.deleteMany(filter) },
}

/* ─── SERVICE PROVIDERS ─────────────────────────────────────── */
const ServiceProviders = {
  async findById(id)  { return await ServiceProvider.findById(id).lean() },
  async findAll({ active } = {}) {
    const q = {}
    if (active !== undefined) q.active = active
    return await ServiceProvider.find(q).sort({ createdAt: -1 }).lean()
  },
  async findAvailable(range) {
    const providers = await ServiceProvider.find({ active: true }).lean()

    // Normalize range for comparison: strip trailing XXX for prefix matching
    const normalizeRange = (r) => r ? r.replace(/X+$/i, '').replace(/x+$/i, '') : ''
    const rangePrefix = normalizeRange(range)

    // Helper: does this provider's ranges cover the requested range?
    const rangeMatches = (p) => {
      if (!range) return true
      if (!p.ranges || p.ranges.length === 0) return true  // no ranges = accepts any
      return p.ranges.some(r => {
        if (!r.active) return false
        const rPrefix = normalizeRange(r.range)
        // Match if prefixes are equal or one starts with the other
        return rPrefix === rangePrefix ||
               rangePrefix.startsWith(rPrefix) ||
               rPrefix.startsWith(rangePrefix)
      })
    }

    // 1. Manual mode provider with available numbers for this range
    const manual = providers.find(p =>
      p.numberInputMode !== 'auto' &&
      p.numbers && p.numbers.some(n => {
        if (n.used) return false
        if (!range) return true

        const nRange = normalizeRange(n.range || '')

        // If number has no range assigned, check if provider's ranges cover the requested range
        if (!nRange) {
          return rangeMatches(p)
        }

        return nRange === rangePrefix || nRange.startsWith(rangePrefix) || rangePrefix.startsWith(nRange)
      })
    )
    if (manual) return manual

    // 2. Any manual provider with available numbers (no range filter)
    if (!range) {
      const anyManual = providers.find(p =>
        p.numberInputMode !== 'auto' &&
        p.numbers && p.numbers.some(n => !n.used)
      )
      if (anyManual) return anyManual
    }

    // 3. Auto mode provider with matching range and active base URL
    const auto = providers.find(p =>
      p.numberInputMode === 'auto' &&
      p.baseUrls && p.baseUrls.some(u => u.active && u.numberFetchUrl) &&
      rangeMatches(p)
    )
    return auto || null
  },
  async create(data)       { return await ServiceProvider.create(data) },
  async update(id, updates){ return await ServiceProvider.findByIdAndUpdate(id, updates, { new: true }).lean() },
  async delete(id)         { await ServiceProvider.findByIdAndDelete(id) },
}

/* ─── ANNOUNCEMENTS ─────────────────────────────────────────── */
const Announcements = {
  async findAll()          { return await Announcement.find().sort({ createdAt: -1 }).lean() },
  async create(data)       { return await Announcement.create(data) },
  async update(id, data)   { return await Announcement.findByIdAndUpdate(id, data, { new: true }).lean() },
  async delete(id)         { await Announcement.findByIdAndDelete(id) },
}

/* ─── SUPPORT TICKETS ───────────────────────────────────────── */
const SupportTickets = {
  async findById(id)  { return await SupportTicket.findById(id).lean() },
  async find({ userId, status } = {}) {
    const q = {}
    if (userId) q.userId = userId
    if (status) q.status = status
    return await SupportTicket.find(q).sort({ createdAt: -1 }).lean()
  },
  async create(data)       { return await SupportTicket.create({ ...data, status: 'open', messages: data.messages || [] }) },
  async update(id, data)   { return await SupportTicket.findByIdAndUpdate(id, data, { new: true }).lean() },
  async delete(id)         { await SupportTicket.findByIdAndDelete(id) },
  async countWhere(f={})   { return await SupportTicket.countDocuments(f) },
}

/* ─── NEWS POSTS ─────────────────────────────────────────────── */
const NewsPosts = {
  async findAll()          { return await NewsPost.find().sort({ createdAt: -1 }).lean() },
  async create(data)       { return await NewsPost.create(data) },
  async update(id, data)   { return await NewsPost.findByIdAndUpdate(id, data, { new: true }).lean() },
  async delete(id)         { await NewsPost.findByIdAndDelete(id) },
}

module.exports = {
  // Raw Mongoose models
  Admin, Agent, User, OTPLog, Withdrawal, ServiceProvider, Announcement, SupportTicket, NewsPost,
  // Helpers
  findAnyByEmail, findAnyById, compareAnyPassword, getModel, normalizeEmail,
  // Collection wrappers
  Admins, Agents, Users,
  OTPLogs, Withdrawals, ServiceProviders,
  Announcements, SupportTickets, NewsPosts,
}
