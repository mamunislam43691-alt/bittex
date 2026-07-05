const mongoose = require('mongoose')

const WithdrawalMethodSchema = new mongoose.Schema({
  network:     { type: String, required: true },
  name:        { type: String, required: true },
  address:     { type: String, required: true },
  minAmount:   { type: Number, default: 0.5 },
  maxAmount:   { type: Number, default: 500 },
  fee:         { type: Number, default: 0.5 },
  active:      { type: Boolean, default: true },
}, { timestamps: true })

module.exports = mongoose.model('WithdrawalMethod', WithdrawalMethodSchema)
