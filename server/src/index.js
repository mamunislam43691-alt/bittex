require('dotenv').config()
const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const path       = require('path')
const { connectMongoDB } = require('./mongodb')

const app    = express()
const server = http.createServer(app)

// Allow multiple origins: local dev + production URL
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    // Also allow *.railway.app and *.up.railway.app
    if (/\.railway\.app$/.test(origin) || /\.up\.railway\.app$/.test(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}

const io     = new Server(server, { cors: corsOptions })
global.io = io

/* ── Middleware ── */
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

/* ── Routes ── */
app.use('/api/auth',              require('./routes/auth'))
app.use('/api/users',             require('./routes/users'))
app.use('/api/otps',              require('./routes/otps'))
app.use('/api/withdrawals',       require('./routes/withdrawals'))
app.use('/api/withdrawal-methods', require('./routes/withdrawal-methods'))
app.use('/api/settings',          require('./routes/settings'))
app.use('/api/admin',             require('./routes/admin'))
app.use('/api/agent-analytics',   require('./routes/agentAnalytics'))
app.use('/api/service-providers', require('./routes/serviceProviders'))
app.use('/api/profile',           require('./routes/profile'))
app.use('/api/database',          require('./routes/database'))
app.use('/api/email',             require('./routes/email'))

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  const readyState = require('mongoose').connection.readyState
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  res.json({
    status: readyState === 1 ? 'ok' : 'degraded',
    db: states[readyState] || 'unknown',
    dbCode: readyState,
    time: new Date().toISOString(),
  })
})

/* ── Serve React frontend (Railway full-stack mode) ── */
const frontendDist = path.join(__dirname, '../../public')
const fs = require('fs')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  // SPA fallback — send index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

/* ── WebSocket ── */
io.on('connection', (socket) => {
  socket.on('join', ({ userId, role }) => {
    socket.join(`user_${userId}`)
    if (['admin', 'superadmin', 'moderator', 'support'].includes(role)) socket.join('admin')
    if (role === 'agent') socket.join(`agent_${userId}`)
  })
  socket.on('disconnect', () => {})
})

/* ── Start ── */
async function start() {
  // 1. Connect MongoDB — don't crash if initial connection fails, auto-reconnect will fix it
  try {
    await connectMongoDB()
  } catch (err) {
    console.warn('⚠ Server starting without DB — will auto-reconnect:', err.message)
  }

  // 1.5. Ensure fixed superadmin account always exists
  try {
    const { ensureSuperadmin } = require('./ensureSuperadmin')
    await ensureSuperadmin()
  } catch (err) {
    console.warn('⚠ Could not ensure superadmin:', err.message)
  }

  // 2. Firebase auto-init (if configured)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const admin = require('firebase-admin')
      if (!admin.apps.length) {
        let credential
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
          const saPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
          credential = admin.credential.cert(require(saPath))
        } else {
          credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        }
        admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID })
        console.log(`✓ Firebase connected (project: ${process.env.FIREBASE_PROJECT_ID})`)
      }
    } catch (e) {
      console.warn(`⚠ Firebase init skipped: ${e.message}`)
    }
  }

  // 3. Gmail check — load from DB settings first, fallback to .env
  try {
    const Settings = require('./models/Settings')
    const emailSetting = await Settings.findOne({ key: 'email' }).lean()
    if (emailSetting?.value?.gmailUser && emailSetting?.value?.gmailAppPass) {
      process.env.GMAIL_USER         = emailSetting.value.gmailUser
      process.env.GMAIL_APP_PASSWORD = emailSetting.value.gmailAppPass
      console.log(`✓ Gmail loaded from DB: ${emailSetting.value.gmailUser}`)
    }
  } catch {}
  if (!process.env.GMAIL_USER || process.env.GMAIL_USER.includes('your_gmail')) {
    console.warn('⚠ Gmail not configured — email verification disabled')
  } else {
    console.log(`✓ Gmail configured: ${process.env.GMAIL_USER}`)
  }

  // 4. Start cleanup scheduler (OTP auto-fail + ticket auto-delete)
  startCleanupScheduler()

  // 4.5. DB keepalive ping (prevents MongoDB Atlas free tier from sleeping)
  setInterval(async () => {
    try {
      const mongoose = require('mongoose')
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping()
      }
    } catch {}
  }, 60000) // every 60s

  // 5. Listen
  const PORT = process.env.PORT || 5000
  server.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`))
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} is already in use. Kill the existing process and restart.`)
      process.exit(1)
    } else {
      throw err
    }
  })
}

/* ── Cleanup Scheduler ── */
function startCleanupScheduler() {
  const mongoose = require('mongoose')
  const OTPLog   = require('./models/OTPLog')

  // Every 5 minutes: auto-fail pending OTPs older than 20 minutes
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 20 * 60 * 1000)
      const result = await OTPLog.updateMany(
        { status: 'pending', createdAt: { $lt: cutoff } },
        { status: 'failed', resolvedAt: new Date() }
      )
      if (result.modifiedCount > 0) {
        console.log(`⏱ Auto-failed ${result.modifiedCount} expired OTPs`)
      }
    } catch {}
  }, 5 * 60 * 1000)

  // Every 5 minutes: remove used numbers from service providers if they were used > 20 minutes ago
  const cleanUsedNumbers = async () => {
    try {
      const ServiceProvider = require('./models/ServiceProvider')
      const cutoff = new Date(Date.now() - 20 * 60 * 1000)
      const providers = await ServiceProvider.find({
        'numbers.used': true,
        'numbers.usedAt': { $lt: cutoff }
      }).lean()

      let totalRemoved = 0
      for (const p of providers) {
        const before = (p.numbers || []).length
        const remaining = (p.numbers || []).filter(n => {
          // Keep if not used, or used within 20 min
          if (!n.used) return true
          if (!n.usedAt) return false // used but no timestamp — remove
          return new Date(n.usedAt).getTime() > cutoff.getTime()
        })
        if (remaining.length < before) {
          await ServiceProvider.findByIdAndUpdate(p._id, { $set: { numbers: remaining } })
          totalRemoved += before - remaining.length
        }
      }
      if (totalRemoved > 0) {
        console.log(`🗑 Removed ${totalRemoved} used numbers from service providers (>20min old)`)
      }
    } catch (err) {
      console.error('cleanUsedNumbers error:', err.message)
    }
  }
  cleanUsedNumbers()
  setInterval(cleanUsedNumbers, 5 * 60 * 1000)

  // Every hour: delete resolved (success/failed) OTP logs older than 12 hours
  const cleanResolvedOTPs = async () => {
    try {
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
      const result = await OTPLog.deleteMany({
        status: { $in: ['success', 'failed'] },
        resolvedAt: { $lt: cutoff },
      })
      if (result.deletedCount > 0) {
        console.log(`🗑 Auto-purged ${result.deletedCount} resolved OTP logs (>12h old)`)
        if (global.io) global.io.to('admin').emit('data_updated', { type: 'otps' })
      }
    } catch {}
  }
  cleanResolvedOTPs()
  setInterval(cleanResolvedOTPs, 60 * 60 * 1000) // every 1 hour

  // Daily at startup: delete OTP logs older than 90 days (catch-all fallback)
  const cleanOldOTPs = async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const result = await OTPLog.deleteMany({ createdAt: { $lt: cutoff } })
      if (result.deletedCount > 0) {
        console.log(`🗑 Purged ${result.deletedCount} OTP logs older than 90 days`)
      }
    } catch {}
  }
  cleanOldOTPs()
  setInterval(cleanOldOTPs, 24 * 60 * 60 * 1000)

  console.log('✓ Cleanup scheduler started (12h resolved OTP purge + 90d full purge)')
}

start().catch(err => {
  console.error('✗ Server failed to start:', err.message)
  process.exit(1)
})
