import { X, AlertTriangle } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  icon?: React.ReactNode
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/** Reusable styled confirm dialog — replaces window.confirm() */
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  confirmColor = '#ef4444', icon, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          maxWidth: 440, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '20px 24px 12px',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: confirmColor === '#ef4444' ? '#fef2f2' : '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon || <AlertTriangle size={20} style={{ color: confirmColor }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: 16, fontWeight: 700, color: '#0f172a',
              margin: 0, marginBottom: 6,
            }}>
              {title}
            </h3>
            <p style={{
              fontSize: 13, color: '#475569',
              lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line',
            }}>
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: '#94a3b8', flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{
          padding: '12px 24px 20px',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 700,
              border: 'none', background: confirmColor, color: '#fff',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
