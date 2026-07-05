const router = require('express').Router()
const WithdrawalMethod = require('../models/WithdrawalMethod')
const { protect, authorize, requirePermission } = require('../middleware/auth')
const { propagateToSecondary } = require('./database')

// GET /api/withdrawal-methods — list all (public for users to see available methods)
router.get('/', async (req, res) => {
  try {
    const methods = await WithdrawalMethod.find({ active: true }).sort({ createdAt: -1 })
    res.json({ methods })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/withdrawal-methods/all — admin: list all including inactive
router.get('/all', protect, authorize('admin', 'superadmin'), requirePermission('finance_manage'), async (req, res) => {
  try {
    const methods = await WithdrawalMethod.find().sort({ createdAt: -1 })
    res.json({ methods })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/withdrawal-methods — admin: create
router.post('/', protect, authorize('admin', 'superadmin'), requirePermission('finance_manage'), async (req, res) => {
  try {
    const { network, name, address, cryptoBanConfirm, minAmount, maxAmount, fee } = req.body
    if (!network || !name || !address)
      return res.status(400).json({ message: 'network, name, and address are required' })
    const method = await WithdrawalMethod.create({
      network, name, address, cryptoBanConfirm: cryptoBanConfirm || '',
      minAmount: parseFloat(minAmount) || 0.5,
      maxAmount: parseFloat(maxAmount) || 500,
      fee: parseFloat(fee) || 0.5,
    })
    // Propagate to secondary DBs
    propagateToSecondary('withdrawalmethods', { network, name }, 'insertOne', {
      network, name, address, cryptoBanConfirm: cryptoBanConfirm || '',
      minAmount: parseFloat(minAmount) || 0.5, maxAmount: parseFloat(maxAmount) || 500,
      fee: parseFloat(fee) || 0.5, active: true, createdAt: new Date()
    }).catch(() => {})
    if (global.io) global.io.emit('data_updated', { type: 'withdrawal_methods' })
    res.status(201).json({ method })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/withdrawal-methods/:id — admin: update
router.put('/:id', protect, authorize('admin', 'superadmin'), requirePermission('finance_manage'), async (req, res) => {
  try {
    const { network, name, address, cryptoBanConfirm, minAmount, maxAmount, fee, active } = req.body
    const update = {}
    if (network !== undefined) update.network = network
    if (name !== undefined) update.name = name
    if (address !== undefined) update.address = address
    if (cryptoBanConfirm !== undefined) update.cryptoBanConfirm = cryptoBanConfirm
    if (minAmount !== undefined) update.minAmount = parseFloat(minAmount)
    if (maxAmount !== undefined) update.maxAmount = parseFloat(maxAmount)
    if (fee !== undefined) update.fee = parseFloat(fee)
    if (active !== undefined) update.active = active
    const method = await WithdrawalMethod.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!method) return res.status(404).json({ message: 'Method not found' })
    if (global.io) global.io.emit('data_updated', { type: 'withdrawal_methods' })
    res.json({ method })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/withdrawal-methods/:id — admin: delete
router.delete('/:id', protect, authorize('admin', 'superadmin'), requirePermission('finance_manage'), async (req, res) => {
  try {
    const method = await WithdrawalMethod.findByIdAndDelete(req.params.id)
    if (!method) return res.status(404).json({ message: 'Method not found' })
    if (global.io) global.io.emit('data_updated', { type: 'withdrawal_methods' })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router
