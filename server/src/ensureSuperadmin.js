/**
 * ensureSuperadmin.js
 *
 * Ensures critical fixed accounts are always correct on every server startup.
 *
 * Superadmin (FIXED - cannot be deleted/changed):
 *   Email:    mamunislam4363@gmail.com
 *   Password: Mamunislam4363@
 *   Role:     superadmin
 *   Status:   active
 *   All 21 permissions including all_access
 *
 * This script:
 *   - Resets password every startup (so it's ALWAYS correct)
 *   - Sets role=superadmin, status=active, profileComplete=true
 *   - Restores all permissions if missing
 *   - Pre-hashes the password manually to bypass the select:false issue
 */
const bcrypt  = require('bcryptjs')
const { Admin } = require('./db')

const SUPERADMIN_EMAIL    = 'mamunislam4363@gmail.com'
const SUPERADMIN_PASSWORD = 'Mamunislam4363@'
const SUPERADMIN_USERNAME = 'Mamunislam4363'  // human-readable username

async function ensureSuperadmin(io) {
  try {
    // Pre-hash the password so we can store it directly without triggering save hooks
    // (Admin.password has select:false, which makes comparePassword tricky)
    const preHashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 12)

    // Find the existing account (we don't need to compare old password
    // because we ALWAYS reset to the fixed value on startup)
    const existing = await Admin.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() })

    const ALL_ACCESS = [
      'all_access','user_manage','user_view','user_ban',
      'agent_manage','agent_view',
      'finance_manage','withdrawal_view','withdrawal_manage','commission_view',
      'announcement','announcement_view',
      'newsfeed','newsfeed_view',
      'ticket_manage','ticket_view',
      'otp_monitor','analytics','system_settings','role_manage','database_manage',
    ]

    if (!existing) {
      // Create new superadmin
      const doc = new Admin({
        username:        SUPERADMIN_USERNAME,
        email:           SUPERADMIN_EMAIL.toLowerCase(),
        password:        preHashedPassword,
        role:            'superadmin',
        status:          'active',
        permissions:     ALL_ACCESS,
        profileComplete: true,
        firstName:       'Super',
        lastName:        'Admin',
        joinedAt:        new Date(),
      })
      // Mark password as NOT modified to skip the pre-save hash (it's already hashed)
      doc.markModified = () => {}
      await Admin.collection.insertOne(doc.toObject())
      console.log(`✓ Superadmin created: ${SUPERADMIN_EMAIL}`)
      if (io) io.emit('admin_created', { email: SUPERADMIN_EMAIL })
      return
    }

    // Update existing — write password directly without triggering hash hook
    const updates = {
      password:        preHashedPassword,
      role:            'superadmin',
      status:          'active',
      permissions:     ALL_ACCESS,
      profileComplete: true,
      username:        existing.username || SUPERADMIN_USERNAME,
      firstName:       existing.firstName || 'Super',
      lastName:        existing.lastName || 'Admin',
    }

    await Admin.collection.updateOne(
      { email: SUPERADMIN_EMAIL.toLowerCase() },
      { $set: updates }
    )

    console.log(`✓ Superadmin synced: ${SUPERADMIN_EMAIL} (role=${updates.role}, status=${updates.status}, password reset)`)
  } catch (err) {
    console.error('✗ Failed to ensure superadmin:', err.message)
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'))
  }
}

module.exports = { ensureSuperadmin, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD }
