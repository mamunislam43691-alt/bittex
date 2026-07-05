const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  from:   { type: String, enum: ['user','admin','agent'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text:   { type: String },
  image:  { type: String },
  time:   { type: Date, default: Date.now },
})

const SupportTicketSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String },
  subject:  { type: String, required: true },
  status:   { type: String, enum: ['open','replaced'], default: 'open' },
  messages: [MessageSchema],
}, { timestamps: true })

SupportTicketSchema.index({ userId: 1 })
SupportTicketSchema.index({ status: 1 })

module.exports = mongoose.model('SupportTicket', SupportTicketSchema)
