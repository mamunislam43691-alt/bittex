/**
 * Agent.js — Model for agent role
 * Collection: agents
 */
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const SessionSchema = new mongoose.Schema({
  ip:        { type: String },
  mac:       { type: String },
  device:    { type: String },
  browser:   { type: String },
  loginAt:   { type: Date, default: Date.now },
  ipBanned:  { type: Boolean, default: false },
  macBanned: { type: Boolean, default: false },
})

const AgentSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  phone:           { type: String, default: '' },
  password:        { type: String, required: true, select: false },
  role:            { type: String, default: 'agent', immutable: true },
  status:          { type: String, enum: ['active','banned','suspended','inactive'], default: 'active' },
  commission:      { type: Number, default: 15 },
  balance:         { type: Number, default: 0 },
  totalEarned:     { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  apiEnabled:      { type: Boolean, default: true },
  apiKey:          { type: String, unique: true, sparse: true },
  sessions:        [SessionSchema],
  firstName:       { type: String, default: '' },
  lastName:        { type: String, default: '' },
  country:         { type: String, default: '' },
  city:            { type: String, default: '' },
  photoUrl:        { type: String, default: '' },
  telegram:        { type: String, default: '' },
  profileComplete: { type: Boolean, default: false },
  joinedAt:        { type: Date, default: Date.now },
  lastLogin:       { type: Date },
  preferences: {
    theme:           { type: String, enum: ['light','dark','auto'], default: 'auto' },
    accentColor:     { type: String, default: 'blue' },
    language:        { type: String, default: 'en' },
    sidebarCollapsed:{ type: Boolean, default: false },
    cookieConsent:   { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'agents' })

AgentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

AgentSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

AgentSchema.methods.generateApiKey = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  this.apiKey = 'bttx_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return this.apiKey
}

module.exports = mongoose.model('Agent', AgentSchema)
