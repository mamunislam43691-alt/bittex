const mongoose = require('mongoose')

const NumberEntrySchema = new mongoose.Schema({
  number: { type: String, required: true },
  range:  { type: String },
  used:   { type: Boolean, default: false },
  usedAt: { type: Date },
})

/* One range slot — supports priority ordering */
const RangeSlotSchema = new mongoose.Schema({
  range:        { type: String, required: true },  // e.g. "22901952XXX"
  priority:     { type: Number, default: 0 },       // lower = higher priority
  active:       { type: Boolean, default: true },
  successCount: { type: Number, default: 0 },       // for auto-ranking
  pricePerOtp:  { type: Number, default: null },    // per-range OTP price override ($), null = use global
})

/* External base-URL pair — one for fetching numbers, one for receiving OTPs */
const BaseUrlSchema = new mongoose.Schema({
  label:          { type: String, default: 'Default' },
  numberFetchUrl: { type: String, default: '' }, // GET number from provider
  liveCheckUrl:   { type: String, default: '' }, // GET check if OTP arrived
  otpReceiveUrl:  { type: String, default: '' }, // provider POSTs OTP here (our endpoint)
  apiKey:         { type: String, default: '' }, // Provider API key
  active:         { type: Boolean, default: true },
  extraUrls:      [{ label: String, url: String }], // optional extra endpoints
})

const ServiceProviderSchema = new mongoose.Schema({
  country:    { type: String, required: true },
  service:    { type: String, default: '' },           // legacy single service (backward compat)
  services:   [{ type: String }],                      // new: multiple services per provider
  numbers:    [NumberEntrySchema],

  // Legacy single URL fields (kept for backward compat)
  extApiKey:  { type: String, default: '' },
  extBaseUrl: { type: String, default: '' },

  // New: multiple base URL pairs
  baseUrls: [BaseUrlSchema],

  // Range management
  ranges:   [RangeSlotSchema],
  autoRangeEnabled: { type: Boolean, default: false },  // auto-pick best range

  // Number input mode
  numberInputMode: { type: String, enum: ['manual', 'auto'], default: 'manual' },

  active:     { type: Boolean, default: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

// Virtual: available numbers
ServiceProviderSchema.virtual('availableCount').get(function() {
  return this.numbers.filter(n => !n.used).length
})

// Virtual: active ranges from the ranges array
ServiceProviderSchema.virtual('activeRanges').get(function() {
  // Prefer the dedicated ranges array; fall back to extracting from numbers
  if (this.ranges && this.ranges.length > 0) {
    return this.ranges
      .filter(r => r.active)
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.range)
  }
  return [...new Set(this.numbers.filter(n => !n.used).map(n => n.range).filter(Boolean))]
})

// Virtual: all services (merges 'service' + 'services')
ServiceProviderSchema.virtual('allServices').get(function() {
  const s = new Set()
  if (this.service) s.add(this.service)
  ;(this.services || []).forEach(svc => { if (svc) s.add(svc) })
  return [...s]
})

// Virtual: best range (highest success rate, for autoRangeEnabled)
ServiceProviderSchema.virtual('bestRange').get(function() {
  if (!this.ranges || this.ranges.length === 0) return null
  const active = this.ranges.filter(r => r.active)
  if (active.length === 0) return null
  return active.sort((a, b) => b.successCount - a.successCount)[0].range
})

ServiceProviderSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('ServiceProvider', ServiceProviderSchema)
