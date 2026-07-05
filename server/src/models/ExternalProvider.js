/**
 * ExternalProvider.js — Configuration for connecting to external SMS panels
 * (e.g. 5sim.net, smspva.com, sms-activate.org, etc.)
 *
 * Each provider config stores:
 *   - Base URL (e.g. https://5sim.net/v1)
 *   - API Key / bearer token
 *   - Routes (http method + path) for: getNumber, getStatus, setStatus, getBalance
 *   - Polling/webhook config for OTP delivery
 *   - Headers + param mapping
 */
const mongoose = require('mongoose')

const RouteSchema = new mongoose.Schema({
  method:    { type: String, enum: ['GET','POST'], default: 'GET' },
  path:      { type: String, required: true },        // e.g. "/user/buy/activation/{service}/{country}"
  parseMode: { type: String, enum: ['json','text','custom'], default: 'json' },
  notes:     { type: String, default: '' },
}, { _id: false })

const ExternalProviderSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, required: true },     // shown in admin UI
  baseUrl:     { type: String, required: true },     // e.g. https://5sim.net/v1
  apiKey:      { type: String, default: '' },        // bearer token
  enabled:     { type: Boolean, default: true },

  // HTTP routes the provider exposes — admin fills these in
  routes: {
    getBalance: { type: RouteSchema, default: () => ({ method: 'GET',  path: '/user/balance' }) },
    getNumber:  { type: RouteSchema, default: () => ({ method: 'GET',  path: '/user/buy/activation/{country}/{operator}/{product}' }) },
    getStatus:  { type: RouteSchema, default: () => ({ method: 'GET',  path: '/user/check/{id}' }) },
    setStatus:  { type: RouteSchema, default: () => ({ method: 'GET',  path: '/user/set_status/{id}/{status}' }) },
    getSms:     { type: RouteSchema, default: () => ({ method: 'GET',  path: '/user/sms/{id}' }) },
  },

  // Optional extra headers
  extraHeaders: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Polling config (since most external panels don't support webhooks)
  poll: {
    enabled:      { type: Boolean, default: true },
    intervalSec:  { type: Number, default: 5 },
    timeoutMin:   { type: Number, default: 5 },    // after this, mark OTP as failed
  },

  // ── CALLBACK (webhook) ──
  // Admin configures:
  //   callbackEnabled: enables receiving OTP via callback URL
  //   callbackSecret:   shared secret the provider must send via header `X-BITTX-Secret`
  //                     (so random / unauthorized POSTs are rejected)
  // ───────────────────────
  callbackEnabled: { type: Boolean, default: false },
  callbackSecret:  { type: String,  default: '' },

  notes:     { type: String, default: '' },
  createdBy: { type: String, default: 'admin' },    // admin email
  createdAt: { type: Date,   default: Date.now },
  updatedAt: { type: Date,   default: Date.now },
}, { timestamps: true, collection: 'externalproviders' })

/**
 * Auto-generate a callback secret if none set — 32-char random hex.
 * Returns the secret string (caller decides to save it or surface in response).
 */
ExternalProviderSchema.statics.generateSecret = function () {
  const crypto = require('crypto')
  return crypto.randomBytes(24).toString('hex')
}

module.exports = mongoose.model('ExternalProvider', ExternalProviderSchema)
