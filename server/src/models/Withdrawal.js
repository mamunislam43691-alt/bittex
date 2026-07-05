const mongoose = require('mongoose')

const WithdrawalSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:    { type: String },
  amount:      { type: Number, required: true, min: 0 },
  network:     { type: String, required: true },
  address:     { type: String, required: true },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:        { type: String },
}, { timestamps: true })

WithdrawalSchema.index({ userId: 1, createdAt: -1 })
WithdrawalSchema.index({ status: 1 })

module.exports = mongoose.model('Withdrawal', WithdrawalSchema)
