/**
 * MongoDB connection setup with auto-reconnect
 */
const mongoose = require('mongoose')

let isConnected = false
let reconnectTimer = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

async function connectMongoDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✓ Using existing MongoDB connection')
    return mongoose.connection
  }

  try {
    const mongoURI = process.env.MONGODB_URI
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables')
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      heartbeatFrequencyMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
    })

    isConnected = true
    reconnectAttempts = 0
    console.log('✓ MongoDB connected successfully')
    console.log('  URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'))
    return mongoose.connection
  } catch (error) {
    isConnected = false
    console.error('✗ MongoDB connection failed:', error.message)
    scheduleReconnect()
    throw error
  }
}

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  if (isConnected) {
    isConnected = false
    console.warn('⚠ MongoDB disconnected — attempting reconnect...')
    scheduleReconnect()
  }
})

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB connection error:', err.message)
  if (isConnected) {
    isConnected = false
    scheduleReconnect()
  }
})

mongoose.connection.on('reconnected', () => {
  isConnected = true
  reconnectAttempts = 0
  console.log('✓ MongoDB reconnected')
})

mongoose.connection.on('connected', () => {
  isConnected = true
  reconnectAttempts = 0
  console.log('✓ MongoDB connected event fired')
})

function scheduleReconnect() {
  if (reconnectTimer) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('✗ Max reconnect attempts reached. Manual restart required.')
    return
  }
  const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts), 30000)
  reconnectAttempts++
  console.log(`  Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${(delay/1000).toFixed(1)}s...`)
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    try {
      await connectMongoDB()
    } catch (err) {
      console.error('✗ Reconnect failed:', err.message)
      scheduleReconnect()
    }
  }, delay)
}

function disconnectMongoDB() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  reconnectAttempts = 0
  if (isConnected || mongoose.connection.readyState !== 0) {
    mongoose.disconnect()
    isConnected = false
    console.log('✓ MongoDB disconnected')
  }
}

module.exports = { connectMongoDB, disconnectMongoDB }
