/**
 * User.js — Model for regular users
 * Collection: users
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

const UserSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  phone:           { type: String, default: '' },
  password:        { type: String, required: true, select: false },
  role:            { type: String, default: 'user', immutable: true },
  status:          { type: String, enum: ['active','banned','suspended','pending'], default: 'pending' },
  agentId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  agentEmail:      { type: String, default: '' },
  balance:         { type: Number, default: 0 },
  totalEarned:     { type: Number, default: 0 },
  country:         { type: String, default: '' },
  joinedAt:        { type: Date, default: Date.now },
  lastLogin:       { type: Date },
  otpCount:        { type: Number, default: 0 },
  successRate:     { type: Number, default: 0 },
  otpActive:       { type: Boolean, default: false },
  lastOtpAt:       { type: Date, default: null },
  apiEnabled:      { type: Boolean, default: false },
  apiKey:          { type: String, unique: true, sparse: true },
  sessions:        [SessionSchema],
  // Profile
  firstName:       { type: String, default: '' },
  lastName:        { type: String, default: '' },
  bio:             { type: String, default: '' },
  city:            { type: String, default: '' },
  birthDate:       { type: String, default: '' },
  timezone:        { type: String, default: 'UTC+0' },
  address:         { type: String, default: '' },
  telegram:        { type: String, default: '' },
  photoUrl:        { type: String, default: '' },
  profileComplete: { type: Boolean, default: false },
  recoveryCode:    { type: String, default: null },
  // Security settings (per-user)
  twoFALogin:      { type: Boolean, default: false },
  twoFAPayments:   { type: Boolean, default: false },
  // Saved withdrawal addresses
  savedAddresses:  { type: Array, default: [] },
  // Agent commission override for this specific user (null = use agent's default rate)
  customCommission: { type: Number, default: null },
  // so UI state survives across browsers/devices, not bound to one localStorage
  preferences: {
    theme:           { type: String, enum: ['light','dark','auto'], default: 'auto' },
    accentColor:     { type: String, default: 'blue' },
    language:        { type: String, default: 'en' },
    sidebarCollapsed:{ type: Boolean, default: false },
    cookieConsent:   { type: Boolean, default: false },
    hasSeenWelcome:  { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'users' })

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

UserSchema.methods.generateApiKey = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  this.apiKey = 'bttx_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return this.apiKey
}

module.exports = mongoose.model('User', UserSchema)
