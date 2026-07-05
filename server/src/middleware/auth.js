const jwt = require('jsonwebtoken')
const { findAnyById, Admins, Agents, Users } = require('../db')

/* ── Verify JWT — searches admins → agents → users ── */
exports.protect = async (req, res, next) => {
  try {
    let token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies?.token) {
      token = req.cookies.token
    }
    if (!token) return res.status(401).json({ message: 'Not authenticated' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Search all three collections
    const account = await findAnyById(decoded.id)
    if (!account) return res.status(401).json({ message: 'Account not found' })
    if (account.status === 'banned')    return res.status(403).json({ message: 'Account banned' })
    if (account.status === 'suspended') return res.status(403).json({ message: 'Account suspended' })

    req.user = account
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

/* ── Role-based access ── */
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Role '${req.user.role}' is not authorized` })
  }
  next()
}

/* ── Permission-based access (admins only) ── */
exports.requirePermission = (...perms) => (req, res, next) => {
  if (!['superadmin','admin','moderator','support'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' })
  }
  const userPerms = req.user.permissions || []
  if (userPerms.includes('all_access')) return next()
  const hasAll = perms.every(p => userPerms.includes(p))
  if (!hasAll) {
    return res.status(403).json({ message: `Missing permission: ${perms.join(' + ')}` })
  }
  next()
}

/* ── API key auth — checks users and agents ── */
exports.apiKeyAuth = async (req, res, next) => {
  const key = req.query.token || req.headers['x-api-key']
  if (!key) return res.status(401).json({ message: 'API key required' })

  // Check users first, then agents
  let account = await Users.findByApiKey(key)
  if (!account) account = await Agents.findByApiKey(key)

  if (!account || !account.apiEnabled)
    return res.status(401).json({ message: 'Invalid or disabled API key' })
  if (account.status !== 'active')
    return res.status(403).json({ message: 'Account inactive' })

  req.user = account
  next()
}
