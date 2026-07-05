import { useState } from 'react'
import { Target } from 'lucide-react'

export interface OTPTarget {
  enabled: boolean
  period: 'daily' | 'monthly'
  limit: number
  action: 'suspend' | 'ban'
}

interface Props {
  value: OTPTarget
  onChange: (v: OTPTarget) => void
  accentColor?: string
}

export default function OTPTargetSection({ value, onChange, accentColor = '#7c3aed' }: Props) {
  const up = (k: keyof OTPTarget, v: any) => onChange({ ...value, [k]: v })

  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
      {/* Header with toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: value.enabled ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={14} style={{ color: accentColor }}/>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>OTP Target</p>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Auto action if target not met</span>
        </div>
        <button onClick={() => up('enabled', !value.enabled)}
          style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: value.enabled ? accentColor : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
            left: value.enabled ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
        </button>
      </div>

      {value.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Period */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>PERIOD</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['daily','monthly'] as const).map(p => (
                <button key={p} onClick={() => up('period', p)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    background: value.period === p ? accentColor : '#fff',
                    color: value.period === p ? '#fff' : '#64748b',
                    boxShadow: value.period === p ? `0 2px 8px ${accentColor}40` : 'none' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>
              MINIMUM OTPs ({value.period === 'daily' ? 'per day' : 'per month'})
            </label>
            <input type="number" value={value.limit} min="1"
              onChange={e => up('limit', parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              placeholder="e.g. 5000"/>
          </div>

          {/* Action */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>
              IF TARGET NOT MET → AUTO ACTION
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { key: 'suspend', label: '⏸ Suspend', bg: '#fef9c3', color: '#b45309', activeBg: '#f59e0b' },
                { key: 'ban',     label: '⛔ Ban',     bg: '#fee2e2', color: '#dc2626', activeBg: '#ef4444' },
              ] as const).map(a => (
                <button key={a.key} onClick={() => up('action', a.key)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: value.action === a.key ? a.activeBg : a.bg,
                    color: value.action === a.key ? '#fff' : a.color }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '8px 12px', border: '1px solid #fed7aa' }}>
            <p style={{ fontSize: 12, color: '#c2410c', margin: 0, lineHeight: 1.5 }}>
              ⚡ If user sends fewer than <strong>{value.limit.toLocaleString()} OTPs</strong> {value.period === 'daily' ? 'today' : 'this month'},
              they will be automatically <strong>{value.action === 'ban' ? 'banned' : 'suspended'}</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
