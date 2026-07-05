const router = require('express').Router()
const mongoose = require('mongoose')
const { protect, authorize } = require('../middleware/auth')

const adminOnly = [protect, authorize('admin', 'superadmin')]

// In-memory DB config store
const dbConfigs = []

// Active secondary connections pool
const secondaryConnections = new Map()

// Round-robin counter for user distribution
let roundRobinIndex = 0

// Helper: get next secondary DB for new user assignment
function getNextSecondaryDb() {
  const connected = dbConfigs.filter(c => c.connected && secondaryConnections.get(c.id)?.readyState === 1)
  if (connected.length === 0) return null
  const db = connected[roundRobinIndex % connected.length]
  roundRobinIndex = (roundRobinIndex + 1) % connected.length
  return db
}

// Helper: get all connected secondary DBs
function getAllSecondaryDbs() {
  return dbConfigs.filter(c => c.connected && secondaryConnections.get(c.id)?.readyState === 1)
}

// Helper: write a document to all secondary DBs (for propagation)
async function propagateToSecondary(collectionName, filter, operation, data) {
  const results = { success: [], errors: [] }
  for (const config of dbConfigs) {
    const conn = secondaryConnections.get(config.id)
    if (!conn || conn.readyState !== 1) continue
    try {
      const db = conn.db
      if (operation === 'insertOne') {
        // Use upsert to avoid duplicate errors
        await db.collection(collectionName).updateOne(filter, { $set: data }, { upsert: true })
      } else if (operation === 'updateOne') {
        await db.collection(collectionName).updateOne(filter, data)
      } else if (operation === 'deleteOne') {
        await db.collection(collectionName).deleteOne(filter)
      } else if (operation === 'deleteMany') {
        await db.collection(collectionName).deleteMany(filter)
      } else if (operation === 'findOneAndUpdate') {
        await db.collection(collectionName).findOneAndUpdate(filter, data.update, { upsert: true })
      }
      results.success.push(config.id)
    } catch (err) {
      results.errors.push({ id: config.id, error: err.message })
    }
  }
  return results
}

// Required collections for auto-setup
const REQUIRED_COLLECTIONS = [
  'admins', 'agents', 'users', 'otplogs', 'withdrawals',
  'withdrawalmethods', 'serviceproviders', 'announcements',
  'supporttickets', 'newsposts', 'settings'
]

// Required indexes per collection
const COLLECTION_INDEXES = {
  admins: [{ email: 1 }, { username: 1 }],
  agents: [{ email: 1 }, { username: 1 }],
  users: [{ email: 1 }, { username: 1 }, { agentId: 1 }, { agentEmail: 1 }],
  otplogs: [{ userId: 1 }, { agentId: 1 }, { status: 1 }, { createdAt: -1 }],
  withdrawals: [{ userId: 1 }, { status: 1 }, { requestedAt: -1 }],
  withdrawalmethods: [{ network: 1 }, { active: 1 }],
  serviceproviders: [{ country: 1 }, { service: 1 }],
  announcements: [{ active: 1 }],
  supporttickets: [{ userId: 1 }, { status: 1 }],
  newsposts: [{ published: 1 }, { category: 1 }],
  settings: [{ key: 1 }]
}

// Seed data for new databases
const SEED_SETTINGS = [
  { key: 'platform', value: { maintenanceMode: false, registrationEnabled: true, telegramSupport: '@bittxsmssupport' } },
  { key: 'otp', value: { defaultRate: 0.005, agentCommission: 15 } },
  { key: 'security', value: { apiAccessDefault: true, twoFactor: false, ipWhitelist: false } },
  { key: 'notifications', value: { emailAlerts: true, browserPush: false } },
  { key: 'maintenance', value: { message: 'System is under maintenance. Please try again later.' } },
]

/* GET /api/database/status — check all connections */
router.get('/status', ...adminOnly, (req, res) => {
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting']

  // Build configs with real connection status
  const configs = dbConfigs.map(c => {
    const conn = secondaryConnections.get(c.id)
    return {
      ...c,
      pass: '***',
      connected: conn ? conn.readyState === 1 : false,
      collections: conn && conn.readyState === 1 ? null : undefined
    }
  })

  res.json({
    primary: {
      uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':***@') : null,
      state: mongoState[mongoose.connection.readyState] || 'unknown',
      name: mongoose.connection.name,
    },
    configs,
  })
})

/* GET /api/database/stats — system + per-DB stats (size, CPU, mem) */
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const os = require('os')
    const fs = require('fs')
    const path = require('path')

    // ── Process / system CPU ──
    const cpuUsage = process.cpuUsage()
    const cpus = os.cpus() || []
    const totalCores = cpus.length || 1
    // Approximation: cumulative user+sys / number of cores
    const totalCpuMicros = cpuUsage.user + cpuUsage.system
    const loadAvg = os.loadavg() // [1min, 5min, 15min]
    const loadPct = Math.min(100, Math.round((loadAvg[0] / totalCores) * 100))
    const cpuModel = cpus[0]?.model || 'Unknown'
    const cpuSpeedMHz = cpus[0]?.speed || 0

    // ── Process memory ──
    const mem = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem  = os.freemem()
    const usedMem  = totalMem - freeMem
    const rssMB    = +(mem.rss / 1024 / 1024).toFixed(2)
    const heapUsedMB  = +(mem.heapUsed / 1024 / 1024).toFixed(2)
    const heapTotalMB = +(mem.heapTotal / 1024 / 1024).toFixed(2)
    const systemMemPct = Math.round((usedMem / totalMem) * 100)

    // ── Per-database stats (collections + counts) ──
    // Note: collStats / dbStats commands are restricted on MongoDB Atlas free tier.
    // We fall back to countDocuments() which works on all tiers.
    async function dbStats(conn, label, kind) {
      if (!conn || conn.readyState !== 1) {
        return { label, kind, connected: false, sizeBytes: 0, displaySize: '0 B', collections: [] }
      }
      try {
        const db = conn.db
        const dbName = db.databaseName
        const colls = await db.listCollections().toArray()
        const collectionRows = []

        for (const c of colls) {
          // Try collStats first (works on self-hosted), fallback to countDocuments (Atlas)
          let count = 0, sizeBytes = 0, storageSize = 0, avgObjSize = 0
          try {
            const stats = await db.command({ collStats: c.name, scale: 1 })
            count       = stats?.count       || 0
            sizeBytes   = stats?.size        || 0
            storageSize = stats?.storageSize || 0
            avgObjSize  = stats?.avgObjSize  || 0
          } catch {
            // Atlas free tier: collStats restricted — use countDocuments
            count = await db.collection(c.name).countDocuments().catch(() => 0)
          }
          collectionRows.push({
            name: c.name,
            count,
            sizeBytes,
            storageSizeBytes: storageSize,
            avgObjSize,
            displaySize: sizeBytes > 0 ? humanBytes(sizeBytes) : `${count} docs`,
          })
        }

        const totalSize = collectionRows.reduce((s, c) => s + c.sizeBytes, 0)
        return {
          label, kind, connected: true,
          dbName,
          sizeBytes: totalSize,
          displaySize: totalSize > 0 ? humanBytes(totalSize) : `${collectionRows.length} collections`,
          collections: collectionRows.sort((a, b) => b.count - a.count),
        }
      } catch (e) {
        return { label, kind, connected: false, error: e.message, sizeBytes: 0, displaySize: '0 B', collections: [] }
      }
    }

    function humanBytes(bytes) {
      if (!bytes || bytes < 1) return '0 B'
      const units = ['B','KB','MB','GB','TB']
      let i = 0
      let n = bytes
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
      return `${n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0)} ${units[i]}`
    }

    // Primary DB
    const primaryStats = await dbStats(mongoose.connection, mongoose.connection.name, 'primary')

    // Free disk space of the process's working directory (best-effort)
    let diskInfo = null
    let diskTotalBytes = 0, diskFreeBytes = 0, diskUsedBytes = 0, diskUsedPct = 0
    try {
      const stats = fs.statfsSync(path.resolve('.'))
      diskTotalBytes = stats.blocks * stats.bsize
      diskFreeBytes  = stats.bavail * stats.bsize
      diskUsedBytes  = diskTotalBytes - diskFreeBytes
      diskUsedPct = Math.round((diskUsedBytes / diskTotalBytes) * 100)
    } catch (e) {
      diskInfo = { error: 'Disk info unavailable on this host' }
    }
    if (!diskInfo) {
      diskInfo = {
        totalBytes: diskTotalBytes,
        freeBytes: diskFreeBytes,
        usedBytes: diskUsedBytes,
        totalDisplay: humanBytes(diskTotalBytes),
        freeDisplay:  humanBytes(diskFreeBytes),
        usedDisplay:  humanBytes(diskUsedBytes),
        usedPct:      diskUsedPct,
      }
    }

    // Secondary DBs
    const secondary = []
    for (const cfg of dbConfigs) {
      const conn = secondaryConnections.get(cfg.id)
      const ds = await dbStats(conn, cfg.label, 'secondary')
      ds.id = cfg.id
      secondary.push(ds)
    }

    res.json({
      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch:     os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        pid: process.pid,
      },
      cpu: {
        model: cpuModel,
        cores: totalCores,
        speedMHz: cpuSpeedMHz,
        loadAvg,
        loadPct,
        processCpuTotalMicros: totalCpuMicros,
      },
      memory: {
        rss: { bytes: mem.rss,            display: humanBytes(mem.rss) },
        heapUsed: { bytes: mem.heapUsed,   display: humanBytes(mem.heapUsed) },
        heapTotal: { bytes: mem.heapTotal, display: humanBytes(mem.heapTotal) },
        external: { bytes: mem.external,   display: humanBytes(mem.external) },
        system: { totalBytes: totalMem, freeBytes: freeMem, usedBytes: usedMem,
                  totalDisplay: humanBytes(totalMem),
                  freeDisplay:  humanBytes(freeMem),
                  usedDisplay:  humanBytes(usedMem),
                  usedPct:      systemMemPct },
      },
      disk: diskInfo,
      primary: primaryStats,
      secondaries: secondary,
      timestamp: Date.now(),
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

/* POST /api/database/test — test a connection string */
router.post('/test', ...adminOnly, async (req, res) => {
  const { type, host, port, user, pass, name, uri: rawUri } = req.body

  try {
    if (type === 'mongodb') {
      let uri
      if (rawUri) {
        uri = rawUri
      } else if (host && user && name) {
        uri = `mongodb+srv://${user}:${pass}@${host}/${name}?retryWrites=true&w=majority`
      } else {
        return res.status(400).json({ success: false, message: 'Provide connection string or fill all fields' })
      }
      const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise()
      const db = conn.db
      const collections = await db.listCollections().toArray()
      await conn.close()
      return res.json({
        success: true,
        message: `✓ MongoDB connected. ${collections.length} collections found.`,
        collections: collections.map(c => c.name)
      })
    }

    res.json({ success: true, message: `✓ ${type} connection format is valid.` })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

/* POST /api/database/save — save a DB config + optional auto-setup */
router.post('/save', ...adminOnly, async (req, res) => {
  const { type, label, host, port, name, user, pass, autoSetup, smartSync, uri: rawUri } = req.body
  const id = 'db_' + Date.now()
  const config = { id, type, label, host, port, name, user, connected: false, addedAt: new Date() }
  if (rawUri) config.uri = rawUri
  dbConfigs.push(config)

  // For MongoDB type — connect and optionally auto-setup
  if (type === 'mongodb') {
    let uri
    if (rawUri) {
      uri = rawUri
    } else if (host && user && name) {
      uri = `mongodb+srv://${user}:${pass}@${host}/${name}?retryWrites=true&w=majority`
    } else {
      config.connected = false
      config.error = 'Missing connection details'
      return res.json({ success: true, config })
    }

    try {
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
      }).asPromise()

      secondaryConnections.set(id, conn)
      config.connected = conn.readyState === 1

      // Auto-setup: create collections + indexes
      if (autoSetup) {
        const setupResult = await autoSetupDatabase(conn, name)
        config.setupResult = setupResult
      }

      // Smart sync: only delete stale data, copy schema
      if (smartSync) {
        const syncResult = await smartSyncData(conn, name)
        config.syncResult = syncResult
      }

      res.json({ success: true, config })
    } catch (err) {
      config.connected = false
      config.error = err.message
      res.status(400).json({ success: false, message: err.message, config })
    }
    return
  }

  res.json({ success: true, config })
})

/* DELETE /api/database/:id — disconnect and remove a config */
router.delete('/:id', ...adminOnly, async (req, res) => {
  const idx = dbConfigs.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Not found' })

  // Close secondary connection if exists
  const conn = secondaryConnections.get(req.params.id)
  if (conn) {
    try { await conn.close() } catch {}
    secondaryConnections.delete(req.params.id)
  }

  dbConfigs.splice(idx, 1)
  res.json({ message: 'Disconnected & removed' })
})

/* POST /api/database/:id/setup — run auto-setup on existing DB */
router.post('/:id/setup', ...adminOnly, async (req, res) => {
  const config = dbConfigs.find(c => c.id === req.params.id)
  if (!config) return res.status(404).json({ message: 'Database not found' })

  const conn = secondaryConnections.get(req.params.id)
  if (!conn || conn.readyState !== 1) {
    return res.status(400).json({ message: 'Database not connected' })
  }

  try {
    const result = await autoSetupDatabase(conn, config.name)
    res.json({ success: true, message: 'Auto-setup complete', result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* POST /api/database/:id/sync — smart sync data from primary */
router.post('/:id/sync', ...adminOnly, async (req, res) => {
  const config = dbConfigs.find(c => c.id === req.params.id)
  if (!config) return res.status(404).json({ message: 'Database not found' })

  const conn = secondaryConnections.get(req.params.id)
  if (!conn || conn.readyState !== 1) {
    return res.status(400).json({ message: 'Database not connected' })
  }

  try {
    const result = await smartSyncData(conn, config.name)
    res.json({ success: true, message: 'Smart sync complete', result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* POST /api/database/:id/disconnect — disconnect without removing */
router.post('/:id/disconnect', ...adminOnly, async (req, res) => {
  const config = dbConfigs.find(c => c.id === req.params.id)
  if (!config) return res.status(404).json({ message: 'Database not found' })

  const conn = secondaryConnections.get(req.params.id)
  if (conn) {
    try { await conn.close() } catch {}
    secondaryConnections.delete(req.params.id)
  }
  config.connected = false
  res.json({ success: true, message: 'Disconnected' })
})

/* POST /api/database/:id/reconnect — reconnect a disconnected DB */
router.post('/:id/reconnect', ...adminOnly, async (req, res) => {
  const config = dbConfigs.find(c => c.id === req.params.id)
  if (!config) return res.status(404).json({ message: 'Database not found' })

  try {
    const uri = `mongodb+srv://${config.user}:${req.body.pass || '***'}@${config.host}/${config.name}?retryWrites=true&w=majority`
    const conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
    }).asPromise()

    secondaryConnections.set(config.id, conn)
    config.connected = conn.readyState === 1
    res.json({ success: true, message: 'Reconnected' })
  } catch (err) {
    config.connected = false
    res.status(400).json({ success: false, message: err.message })
  }
})

/* GET /api/database/:id/collections — list collections in a secondary DB */
router.get('/:id/collections', ...adminOnly, async (req, res) => {
  const conn = secondaryConnections.get(req.params.id)
  if (!conn || conn.readyState !== 1) {
    return res.status(400).json({ message: 'Database not connected' })
  }

  try {
    const db = conn.db
    const collections = await db.listCollections().toArray()
    const result = []
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments()
      result.push({ name: col.name, count })
    }
    res.json({ collections: result })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* GET /api/database/health — quick health check */
router.get('/health', ...adminOnly, async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping()
    const collections = await mongoose.connection.db.listCollections().toArray()

    // Also check secondary connections
    const secondaryStatus = []
    for (const [id, conn] of secondaryConnections) {
      const config = dbConfigs.find(c => c.id === id)
      secondaryStatus.push({
        id,
        label: config?.label || id,
        connected: conn.readyState === 1,
      })
    }

    res.json({
      healthy: true,
      ping: 'ok',
      collections: collections.length,
      secondaryDatabases: secondaryStatus
    })
  } catch (err) {
    res.status(500).json({ healthy: false, error: err.message })
  }
})

/* POST /api/database/update-mongodb-uri — update and reconnect primary MongoDB */
router.post('/update-mongodb-uri', ...adminOnly, async (req, res) => {
  const { uri } = req.body
  if (!uri || !uri.startsWith('mongodb')) {
    return res.status(400).json({ message: 'Invalid MongoDB URI — must start with mongodb:// or mongodb+srv://' })
  }

  try {
    const testConn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise()
    await testConn.close()

    process.env.MONGODB_URI = uri
    await mongoose.disconnect()
    await mongoose.connect(uri)

    const fs = require('fs')
    const path = require('path')
    const envPath = path.resolve(__dirname, '../../.env')
    try {
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
      if (envContent.match(/^MONGODB_URI=.*/m)) {
        envContent = envContent.replace(/^MONGODB_URI=.*/m, `MONGODB_URI=${uri}`)
      } else {
        envContent = `MONGODB_URI=${uri}\n` + envContent
      }
      fs.writeFileSync(envPath, envContent, 'utf8')
    } catch (fsErr) {
      console.warn('Could not persist URI to .env:', fsErr.message)
    }

    res.json({ success: true, message: '✓ MongoDB reconnected successfully!' })
  } catch (err) {
    res.status(400).json({ success: false, message: `Connection failed: ${err.message}` })
  }
})

/* POST /api/database/reset — clear all collections (DANGER) */
router.post('/reset', ...adminOnly, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({})
    }

    res.json({
      success: true,
      message: 'Database reset successfully. All data has been cleared.',
      clearedCollections: collections.map(c => c.name)
    })
  } catch (err) {
    res.status(500).json({ success: false, message: `Reset failed: ${err.message}` })
  }
})

/* ── Auto-Setup: create collections + indexes on a new DB ── */
async function autoSetupDatabase(conn, dbName) {
  const db = conn.db
  const results = { created: [], indexes: [], errors: [] }

  for (const collName of REQUIRED_COLLECTIONS) {
    try {
      // Check if collection exists
      const existing = await db.listCollections({ name: collName }).toArray()
      if (existing.length === 0) {
        await db.createCollection(collName)
        results.created.push(collName)
      }

      // Create indexes
      const indexes = COLLECTION_INDEXES[collName] || []
      for (const indexDef of indexes) {
        try {
          await db.collection(collName).createIndex(indexDef, { background: true })
          results.indexes.push(`${collName}:${JSON.stringify(indexDef)}`)
        } catch (idxErr) {
          // Index might already exist — that's fine
        }
      }
    } catch (err) {
      results.errors.push(`${collName}: ${err.message}`)
    }
  }

  // Insert seed settings if settings collection is empty
  try {
    const settingsCount = await db.collection('settings').countDocuments()
    if (settingsCount === 0) {
      await db.collection('settings').insertMany(SEED_SETTINGS.map(s => ({
        key: s.key,
        value: s.value,
        createdAt: new Date(),
        updatedAt: new Date()
      })))
      results.seedInserted = true
    }
  } catch (err) {
    results.errors.push(`seed: ${err.message}`)
  }

  console.log(`✓ Auto-setup complete for ${dbName}:`, results)
  return results
}

/* ── Smart Sync: only copy missing data, don't overwrite existing ── */
async function smartSyncData(targetConn, targetDbName) {
  const sourceDb = mongoose.connection.db
  const targetDb = targetConn.db
  const results = { synced: [], skipped: [], errors: [] }

  for (const collName of REQUIRED_COLLECTIONS) {
    try {
      // Get source count
      const sourceCount = await sourceDb.collection(collName).countDocuments()

      // Get target count
      const targetCount = await targetDb.collection(collName).countDocuments()

      if (targetCount >= sourceCount) {
        results.skipped.push({ collection: collName, reason: 'target has equal or more data' })
        continue
      }

      if (sourceCount === 0) {
        results.skipped.push({ collection: collName, reason: 'source is empty' })
        continue
      }

      // Copy documents that don't exist in target (by _id)
      const sourceDocs = await sourceDb.collection(collName).find().toArray()
      let syncedCount = 0

      for (const doc of sourceDocs) {
        try {
          const exists = await targetDb.collection(collName).findOne({ _id: doc._id })
          if (!exists) {
            // Remove _id to let MongoDB generate new one in target
            const { _id, ...docWithoutId } = doc
            await targetDb.collection(collName).insertOne(docWithoutId)
            syncedCount++
          }
        } catch (docErr) {
          // Skip individual document errors
        }
      }

      results.synced.push({ collection: collName, count: syncedCount, total: sourceCount })
    } catch (err) {
      results.errors.push(`${collName}: ${err.message}`)
    }
  }

  console.log(`✓ Smart sync complete for ${targetDbName}:`, results)
  return results
}

/* GET /api/database/aggregate/:collection — aggregate data from all connected DBs */
router.get('/aggregate/:collection', ...adminOnly, async (req, res) => {
  const { collection } = req.params
  const { limit = 100, skip = 0, sort = '{}', filter = '{}' } = req.query

  try {
    const sortObj = JSON.parse(sort)
    const filterObj = JSON.parse(filter)
    let allDocs = []

    // Get from primary
    const primaryDb = mongoose.connection.db
    const primaryDocs = await primaryDb.collection(collection)
      .find(filterObj).sort(sortObj).skip(Number(skip)).limit(Number(limit)).toArray()
    allDocs.push(...primaryDocs.map(d => ({ ...d, _source: 'primary' })))

    // Get from all secondary DBs
    for (const config of dbConfigs) {
      const conn = secondaryConnections.get(config.id)
      if (!conn || conn.readyState !== 1) continue
      try {
        const docs = await conn.db.collection(collection)
          .find(filterObj).sort(sortObj).toArray()
        allDocs.push(...docs.map(d => ({ ...d, _source: config.id, _sourceLabel: config.label })))
      } catch (err) {
        // Skip this DB
      }
    }

    // Deduplicate by email/username if users collection
    if (collection === 'users') {
      const seen = new Map()
      for (const doc of allDocs) {
        const key = doc.email || doc.username || doc._id.toString()
        if (!seen.has(key)) seen.set(key, doc)
      }
      allDocs = Array.from(seen.values())
    }

    // Sort and paginate
    allDocs.sort((a, b) => {
      for (const [field, dir] of Object.entries(sortObj)) {
        const cmp = (a[field] > b[field]) ? 1 : (a[field] < b[field]) ? -1 : 0
        if (cmp !== 0) return dir === -1 ? -cmp : cmp
      }
      return 0
    })

    res.json({
      documents: allDocs.slice(0, Number(limit)),
      total: allDocs.length,
      sources: dbConfigs.map(c => ({ id: c.id, label: c.label, connected: c.connected }))
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* GET /api/database/round-robin — get next DB for user assignment */
router.get('/round-robin', ...adminOnly, (req, res) => {
  const next = getNextSecondaryDb()
  res.json({ nextDb: next, total: getAllSecondaryDbs().length })
})

module.exports = router
module.exports.getNextSecondaryDb = getNextSecondaryDb
module.exports.getAllSecondaryDbs = getAllSecondaryDbs
module.exports.propagateToSecondary = propagateToSecondary
module.exports.secondaryConnections = secondaryConnections
module.exports.dbConfigs = dbConfigs
