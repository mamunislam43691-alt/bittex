const router = require('express').Router()
const { Withdrawals, Users, Agents } = require('../db')
const { protect, authorize, requirePermission } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

// Helper: find account balance by role
async function findAccount(role, id) {
  if (role === 'agent') return await Agents.findById(id)
  return await Users.findById(id)
}
async function deductBalance(role, id, amount) {
  if (role === 'agent') return await Agents.increment(id, { balance: -amount })
  return await Users.increment(id, { balance: -amount })
}
async function refundBalance(userId, amount) {
  // Try users first, then agents
  const user  = await Users.findById(userId)
  if (user)   return await Users.increment(userId, { balance: amount })
  const agent = await Agents.findById(userId)
  if (agent)  return await Agents.increment(userId, { balance: amount })
}

// GET /api/withdrawals
router.get('/', protect, async (req, res) => {
  try {
    const filter = {}
    if (!['admin','superadmin','moderator','support'].includes(req.user.role)) {
      filter.userId = String(req.user._id || req.user.id)
    }
    const { status } = req.query
    if (status && status !== 'all') filter.status = status
    const withdrawals = await Withdrawals.find(filter)
    res.json({ withdrawals })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/withdrawals
router.post('/', protect, async (req, res) => {
  try {
    const { amount, network, address } = req.body
    if (!amount || !network || !address)
      return res.status(400).json({ message: 'amount, network, and address are required' })

    const id      = String(req.user._id || req.user.id)
    const account = await findAccount(req.user.role, id)
    if (!account) return res.status(404).json({ message: 'Account not found' })
    if ((account.balance || 0) < parseFloat(amount))
      return res.status(400).json({ message: 'Insufficient balance' })

    await deductBalance(req.user.role, id, parseFloat(amount))

    const w = await Withdrawals.create({
      userId: id, username: req.user.username,
      amount: parseFloat(amount), network, address,
    })
    // Propagate to secondary DBs
    propagateToSecondary('withdrawals', { userId: id, amount: parseFloat(amount), network, address }, 'insertOne', {
      userId: id, username: req.user.username, amount: parseFloat(amount), network, address, status: 'pending', createdAt: new Date()
    }).catch(() => {})
    if (global.io) global.io.emit('data_updated', { type: 'withdrawals' })
    res.status(201).json({ withdrawal: w })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/withdrawals/approve-all  (must come BEFORE /:id)
router.put('/approve-all', protect, authorize('admin','superadmin'), requirePermission('withdrawal_manage'), async (req, res) => {
  try {
    const pending = await Withdrawals.find({ status: 'pending' })
    await Promise.all(pending.map(w =>
      Withdrawals.update(w._id || w.id, {
        status: 'approved',
        processedAt: new Date(),
        processedBy: String(req.user._id || req.user.id),
      })
    ))
    if (global.io) global.io.emit('data_updated', { type: 'withdrawals' })
    res.json({ message: `${pending.length} withdrawals approved` })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/withdrawals/clear-processed (must come BEFORE /:id)
router.delete('/clear-processed', protect, authorize('admin','superadmin'), requirePermission('withdrawal_manage'), async (req, res) => {
  try {
    const result = await Withdrawals.deleteMany({ status: { $in: ['approved', 'rejected'] } })
    if (global.io) global.io.emit('data_updated', { type: 'withdrawals' })
    res.json({ message: `${result.deletedCount} processed withdrawals cleared`, deletedCount: result.deletedCount })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/withdrawals/:id
router.put('/:id', protect, authorize('admin','superadmin'), requirePermission('withdrawal_manage'), async (req, res) => {
  try {
    const { status, note } = req.body
    const w = await Withdrawals.findById(req.params.id)
    if (!w) return res.status(404).json({ message: 'Withdrawal not found' })
    if (w.status !== 'pending')
      return res.status(400).json({ message: 'Already processed' })

    const updated = await Withdrawals.update(req.params.id, {
      status, processedAt: new Date(),
      processedBy: String(req.user._id || req.user.id),
      note: note || null,
    })

    // Refund on rejection
    if (status === 'rejected') {
      await refundBalance(w.userId, w.amount)
    }
    // Propagate status update to secondary DBs
    propagateToSecondary('withdrawals', { userId: w.userId, amount: w.amount, network: w.network, address: w.address }, 'updateOne', { $set: { status, processedAt: new Date() } }).catch(() => {})

    if (global.io) global.io.emit('data_updated', { type: 'withdrawals' })
    res.json({ withdrawal: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
