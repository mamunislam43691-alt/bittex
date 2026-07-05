const router = require('express').Router()
const { Admins, Agents, Users, SupportTickets } = require('../db')
const { protect } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

// Helper: get correct helper by role
function getHelper(role) {
  if (['superadmin','admin','moderator','support'].includes(role)) return Admins
  if (role === 'agent') return Agents
  return Users
}

// GET /api/profile
router.get('/', protect, async (req, res) => {
  try {
    const helper = getHelper(req.user.role)
    const user   = await helper.findById(req.user._id || req.user.id)
    res.json({ user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/profile/preferences — fetch user preferences (theme, language, etc.)
router.get('/preferences', protect, async (req, res) => {
  try {
    const helper = getHelper(req.user.role)
    const user = await helper.findById(req.user._id || req.user.id)
    res.json({ preferences: user.preferences || {} })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/profile/preferences — save user preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: 'Body must be an object' })
    }
    // Whitelist allowed keys to prevent arbitrary field injection
    const allowed = ['theme','accentColor','language','sidebarCollapsed','cookieConsent','hasSeenWelcome']
    const clean = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) clean[k] = req.body[k]
    }
    // Merge into existing preferences (don't overwrite unrelated keys)
    const helper = getHelper(req.user.role)
    const user = await helper.findById(req.user._id || req.user.id)
    const merged = { ...(user.preferences || {}), ...clean }
    await helper.update(req.user._id || req.user.id, { preferences: merged })
    res.json({ preferences: merged })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Public preferences — for landing page (no auth needed).
// Stores theme/language in a Settings doc keyed by 'publicPrefs'.
// Public prefs are intentionally limited (no sensitive admin/agent columns).
router.get('/public-prefs', async (req, res) => {
  try {
    const Settings = require('../models/Settings')
    const doc = await Settings.findOne({ key: 'publicPrefs' }).lean()
    res.json({ preferences: doc?.value || {} })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/public-prefs', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: 'Body must be an object' })
    }
    const allowed = ['theme','accentColor','language','cookieConsent']
    const clean = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) clean[k] = req.body[k]
    }
    const Settings = require('../models/Settings')
    await Settings.updateOne(
      { key: 'publicPrefs' },
      { $set: { key: 'publicPrefs', value: clean, updatedAt: new Date() } },
      { upsert: true }
    )
    res.json({ preferences: clean })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/profile
router.put('/', protect, async (req, res) => {
  try {
    const allowed = ['username','phone','bio','country','city','birthDate',
                     'timezone','address','telegram','photoUrl','firstName','lastName',
                     'profileComplete','twoFALogin','twoFAPayments','savedAddresses']
    const updates = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k] })

    const helper = getHelper(req.user.role)
    const user   = await helper.update(req.user._id || req.user.id, updates)
    if (global.io) {
      const userId = String(req.user._id || req.user.id)
      global.io.to('admin').emit('data_updated', { type: 'users', userId })
      const userRole = req.user.role
      if (userRole === 'agent') global.io.to(`agent_${userId}`).emit('data_updated', { type: 'agents', userId })
      // Also notify the user/agent themselves for profile refresh
      if (userRole === 'user') global.io.to(`user_${userId}`).emit('data_updated', { type: 'users', userId })
      if (userRole === 'agent') global.io.to(`agent_${userId}`).emit('data_updated', { type: 'users', userId })
    }
    res.json({ user })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/profile/api-key
router.post('/api-key', protect, async (req, res) => {
  try {
    const helper = getHelper(req.user.role)
    const account = await helper.findById(req.user._id || req.user.id)
    if (!account.apiEnabled)
      return res.status(403).json({ message: 'API access not enabled for your account' })
    const apiKey = (helper.generateApiKey || Users.generateApiKey).call(helper)
    await helper.update(req.user._id || req.user.id, { apiKey })
    res.json({ apiKey })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/profile/api-key
router.delete('/api-key', protect, async (req, res) => {
  try {
    const helper = getHelper(req.user.role)
    await helper.update(req.user._id || req.user.id, { apiKey: null })
    res.json({ message: 'API key deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/profile/support — create a ticket (user or agent)
router.post('/support', protect, async (req, res) => {
  try {
    const { subject, message } = req.body
    if (!subject || !message)
      return res.status(400).json({ message: 'Subject and message are required' })
    const ticket = await SupportTickets.create({
      userId:   req.user._id || req.user.id,
      username: req.user.username,
      subject,
      messages: [{ from: req.user.role === 'agent' ? 'agent' : 'user', senderId: req.user._id || req.user.id, text: message, time: new Date() }],
    })
    // Propagate support ticket to secondary DBs
    propagateToSecondary('supporttickets', { userId: String(req.user._id || req.user.id), subject }, 'insertOne', {
      userId: String(req.user._id || req.user.id), username: req.user.username, subject,
      messages: [{ from: req.user.role === 'agent' ? 'agent' : 'user', senderId: String(req.user._id || req.user.id), text: message, time: new Date() }],
      status: 'open', createdAt: new Date()
    }).catch(() => {})
    if (global.io) {
      global.io.to('admin').emit('new_ticket', { ticket })
      global.io.emit('data_updated', { type: 'support' })
    }
    res.status(201).json({ ticket })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/profile/support — list tickets for current user/agent
router.get('/support', protect, async (req, res) => {
  try {
    const tickets = await SupportTickets.find({ userId: req.user._id || req.user.id })
    res.json({ tickets })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/profile/support/:id — get single ticket
router.get('/support/:id', protect, async (req, res) => {
  try {
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    res.json({ ticket })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/profile/support/:id/reply — user/agent reply
router.post('/support/:id/reply', protect, async (req, res) => {
  try {
    const { text, image } = req.body
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    const from = req.user.role === 'agent' ? 'agent' : 'user'
    const msg = { from, senderId: req.user._id || req.user.id, text, image, time: new Date() }
    const messages = [...(ticket.messages || []), msg]
    const updated = await SupportTickets.update(req.params.id, { messages })
    if (global.io) global.io.to('admin').emit('ticket_reply', { ticketId: String(ticket._id), msg })
    res.json({ ticket: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/profile/support/:id/close — close own ticket
router.put('/support/:id/close', protect, async (req, res) => {
  try {
    const ticket = await SupportTickets.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Not found' })
    // Mark as closed (not delete) so history is preserved
    const updated = await SupportTickets.update(req.params.id, { status: 'closed' })
    if (global.io) {
      global.io.to('admin').emit('data_updated', { type: 'tickets' })
    }
    res.json({ ticket: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
