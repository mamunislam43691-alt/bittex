const mongoose = require('mongoose')

const OTPLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  number:     { type: String, required: true },
  range:      { type: String },
  service:    { type: String },
  sender:     { type: String, default: null },  // SMS sender ID (e.g. 'FACEBOOK', '62000')
  operator:   { type: String },
  country:    { type: String },
  status:     { type: String, enum: ['pending','success','failed'], default: 'pending' },
  otp:        { type: String, default: null },
  message:    { type: String },
  earnedUser:  { type: Number, default: 0 },  // $ user earned
  earnedAgent: { type: Number, default: 0 },  // $ agent earned
  allocatedAt: { type: Date, default: Date.now },
  resolvedAt:  { type: Date },
}, { timestamps: true })

// Index for fast queries
OTPLogSchema.index({ userId: 1, createdAt: -1 })
OTPLogSchema.index({ agentId: 1, createdAt: -1 })
OTPLogSchema.index({ status: 1 })
OTPLogSchema.index({ sender: 1, range: 1 })

module.exports = mongoose.model('OTPLog', OTPLogSchema)
