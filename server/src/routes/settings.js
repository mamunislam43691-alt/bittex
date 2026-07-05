const router = require('express').Router()
const Settings = require('../models/Settings')
const { protect, authorize, requirePermission } = require('../middleware/auth')
const adminOnly = [protect, authorize('admin', 'superadmin')]

// GET /api/settings — public global settings + userPrefs if logged in
router.get('/', async (req, res) => {
  try {
    const all = await Settings.find().lean()
    const result = {}
    all.forEach(s => { result[s.key] = s.value })

    // If a token is present, also attach userPrefs for the logged-in user
    try {
      const jwt = require('jsonwebtoken')
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bittx_jwt_secret_2024')
        const uid = decoded.id || decoded._id
        if (uid) {
          const prefKey = `userPrefs_${uid}`
          const pref = await Settings.findOne({ key: prefKey }).lean()
          if (pref?.value) result.userPrefs = pref.value
        }
      }
    } catch {}

    res.json(result)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/settings/all — admin only (full settings)
router.get('/all', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    const all = await Settings.find().lean()
    const result = {}
    all.forEach(s => { result[s.key] = s.value })
    res.json(result)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/settings — save settings
// Admin: can save any key
// Logged-in user: can only save their own userPrefs
router.put('/', protect, async (req, res) => {
  try {
    const updates = req.body
    if (!updates || typeof updates !== 'object')
      return res.status(400).json({ message: 'Settings object required' })

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role)

    // Extract userPrefs (per-user) vs global settings (admin only)
    const { userPrefs, ...globalUpdates } = updates

    const ops = []

    // Save per-user prefs scoped to this user's ID
    if (userPrefs && typeof userPrefs === 'object') {
      const uid = String(req.user._id || req.user.id)
      ops.push({
        updateOne: { filter: { key: `userPrefs_${uid}` }, update: { $set: { value: userPrefs } }, upsert: true }
      })
    }

    // Global settings — admin only
    if (isAdmin && Object.keys(globalUpdates).length > 0) {
      Object.entries(globalUpdates).forEach(([key, value]) => {
        ops.push({ updateOne: { filter: { key }, update: { $set: { value } }, upsert: true } })
      })
      if (global.io) global.io.emit('data_updated', { type: 'settings' })
    }

    if (ops.length > 0) await Settings.bulkWrite(ops)
    res.json({ message: 'Settings saved' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/settings/:key — admin: delete a single setting
router.delete('/:key', ...adminOnly, requirePermission('system_settings'), async (req, res) => {
  try {
    await Settings.deleteOne({ key: req.params.key })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
