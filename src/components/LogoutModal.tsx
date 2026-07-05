import { LogOut, X, CheckCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
}

export default function LogoutModal({ onClose }: Props) {
  const { accentColor } = useTheme()
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    onClose()
    // Redirect to correct login page based on role
    if (user && ['admin', 'superadmin'].includes(user.role)) {
      navigate('/admin/login', { replace: true })
    } else if (user?.role === 'agent') {
      navigate('/agent/login', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 400, maxWidth: '92vw',
            background: 'var(--bg-card)',
            borderRadius: 24,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            padding: '36px 32px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Icon */}
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LogOut size={26} style={{ color: '#ef4444' }} />
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Sign out?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              You are about to end this session.
            </p>
          </div>

          {/* Info box */}
          <div style={{
            width: '100%', background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Current session active
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              You'll lose access to:
            </p>
            {[
              "Your dashboard + live console feed",
              "Active getnum allocations",
              "Payment + withdrawal history",
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CheckCircle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <button
              onClick={handleSignOut}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 24,
                fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: '#ef4444', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <LogOut size={15} />
              Yes, sign me out
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px', borderRadius: 24,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
