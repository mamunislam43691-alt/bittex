/**
 * Admin.js — Model for superadmin, admin, moderator, support roles
 * Collection: admins
 */
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

/* ─── Default permissions per role ─────────────── */
const DEFAULT_PERMISSIONS = {
  superadmin: [
    'all_access','user_manage','user_view','user_ban',
    'agent_manage','agent_view',
    'finance_manage','withdrawal_view','withdrawal_manage','commission_view',
    'announcement','announcement_view',
    'newsfeed','newsfeed_view',
    'ticket_manage','ticket_view',
    'otp_monitor','analytics','system_settings','role_manage','database_manage',
  ],
  admin: [
    'user_manage','user_view','user_ban',
    'agent_manage','agent_view',
    'finance_manage','withdrawal_view','withdrawal_manage','commission_view',
    'announcement','announcement_view',
    'newsfeed','newsfeed_view',
    'ticket_manage','ticket_view',
    'otp_monitor','analytics',
  ],
  moderator: [
    'user_view','user_ban',
    'agent_view',
    'withdrawal_view',
    'announcement_view',
    'newsfeed_view',
    'ticket_view',
    'otp_monitor',
  ],
  support: [
    'user_view',
    'ticket_manage','ticket_view',
    'announcement_view',
  ],
}

const ALL_PERMISSIONS = [
  'all_access',
  'user_manage','user_view','user_ban',
  'agent_manage','agent_view',
  'finance_manage','withdrawal_view','withdrawal_manage','commission_view',
  'announcement','announcement_view',
  'newsfeed','newsfeed_view',
  'ticket_manage','ticket_view',
  'otp_monitor','analytics','system_settings','role_manage','database_manage',
]

const SessionSchema = new mongoose.Schema({
  ip:        { type: String },
  mac:       { type: String },
  device:    { type: String },
  browser:   { type: String },
  loginAt:   { type: Date, default: Date.now },
  ipBanned:  { type: Boolean, default: false },
  macBanned: { type: Boolean, default: false },
})

const AdminSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  phone:           { type: String, default: '' },
  password:        { type: String, required: true, select: false },
  role:            { type: String, enum: ['superadmin','admin','moderator','support'], default: 'admin' },
  permissions:     [{ type: String, enum: ALL_PERMISSIONS }],
  status:          { type: String, enum: ['active','banned','suspended'], default: 'active' },
  sessions:        [SessionSchema],
  firstName:       { type: String, default: '' },
  lastName:        { type: String, default: '' },
  photoUrl:        { type: String, default: '' },
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
}, { timestamps: true, collection: 'admins' })

AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

AdminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

module.exports = mongoose.model('Admin', AdminSchema)
module.exports.DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS
module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS
