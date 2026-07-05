import { useRef } from 'react'
import { X, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import type { LanguageCode } from '../locales/translations'

export default function TweaksPanel() {
  const {
    tweaksOpen, setTweaksOpen,
    theme, setTheme,
    accentKey, setAccentKey, accentColor,
    accentColors,
    density, setDensity,
    privacyMode, setPrivacyMode,
    sidebarCollapsed, setSidebarCollapsed,
    alreadyHitEnabled, setAlreadyHitEnabled,
    font, setFont, fonts,
    language, setLanguage,
    t,
  } = useTheme()

  const colorInputRef = useRef<HTMLInputElement>(null)

  if (!tweaksOpen) return null

  /* Shared segment button style */
  const seg = (active: boolean) => ({
    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? accentColor : 'var(--input-bg)',
    color: active ? '#fff' : 'var(--text-secondary)',
  } as React.CSSProperties)

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 40 }}
        onClick={() => setTweaksOpen(false)} />

      {/* Panel — opens to the RIGHT of sidebar, not over content */}
      <div style={{
        position: 'fixed', bottom: 16, left: 228, zIndex: 50,
        width: 280, maxHeight: 'calc(100vh - 80px)',
        background: 'var(--bg-card)', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.tweaks}</p>
          </div>
          <button onClick={() => setTweaksOpen(false)}
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer' }}>
            <X size={14} style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* THEME */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.theme}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setTheme('dark')} style={seg(theme === 'dark')}>
                <Moon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {t.dark}
              </button>
              <button onClick={() => setTheme('light')} style={seg(theme === 'light')}>
                <Sun size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {t.light}
              </button>
            </div>
          </div>

          {/* LANGUAGE */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.language}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2,
              background: 'var(--input-bg)', borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--border)' }}>
              {(['en', 'ar', 'bn', 'hi'] as LanguageCode[]).map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  style={{
                    padding: '12px 16px', border: 'none', cursor: 'pointer',
                    textAlign: 'center', fontSize: 14, fontWeight: language === lang ? 800 : 500,
                    background: language === lang ? accentColor : 'transparent',
                    color: language === lang ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                  className={language !== lang ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}>
                  {lang === 'bn' && t.bengali}
                  {lang === 'en' && t.english}
                  {lang === 'hi' && t.hindi}
                  {lang === 'ar' && t.arabic}
                </button>
              ))}
            </div>
          </div>

          {/* ACCENT COLOR */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.accentColor}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(accentColors).map(([key, color]) => (
                <button key={key} onClick={() => setAccentKey(key)}
                  title={key}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: color, cursor: 'pointer', flexShrink: 0,
                    outline: accentKey === key ? `3px solid #1e293b` : '3px solid transparent',
                    outlineOffset: 2,
                    transform: accentKey === key ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }} />
              ))}
              {/* Rainbow / custom color */}
              <button onClick={() => colorInputRef.current?.click()}
                title="Custom color"
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: 'linear-gradient(135deg,#f43f5e,#f97316,#facc15,#4ade80,#38bdf8,#818cf8)',
                  outline: accentKey === 'custom' ? '3px solid #1e293b' : '3px solid transparent',
                  outlineOffset: 2, transition: 'all 0.15s',
                }} />
              <input ref={colorInputRef} type="color" defaultValue="#7C3AED"
                style={{ display: 'none' }}
                onChange={e => {
                  const hex = e.target.value
                  document.documentElement.style.setProperty('--accent', hex)
                  setAccentKey('custom')
                  // inject into accentColors live
                  ;(accentColors as Record<string, string>)['custom'] = hex
                }} />
            </div>
          </div>

          {/* DENSITY */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.density}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDensity('comfortable')} style={seg(density === 'comfortable')}>
                {t.comfortable}
              </button>
              <button onClick={() => setDensity('compact')} style={seg(density === 'compact')}>
                {t.compact}
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.sidebar}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSidebarCollapsed(false)} style={seg(!sidebarCollapsed)}>
                {t.expanded}
              </button>
              <button onClick={() => setSidebarCollapsed(true)} style={seg(sidebarCollapsed)}>
                {t.collapsed}
              </button>
            </div>
          </div>

          {/* PRIVACY */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{t.privacy}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setPrivacyMode(false)} style={seg(!privacyMode)}>
                {t.showNumbers}
              </button>
              <button onClick={() => setPrivacyMode(true)} style={seg(privacyMode)}>
                {t.hideNumbers}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}
              className="dark:text-slate-400">
              {t.replacesEveryDigit}
            </p>
          </div>

          {/* ALREADY HIT ON THIS RANGE */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>
              ALREADY HIT ON THIS RANGE
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setAlreadyHitEnabled(true)} style={seg(alreadyHitEnabled)}>
                On
              </button>
              <button onClick={() => setAlreadyHitEnabled(false)} style={seg(!alreadyHitEnabled)}>
                Off
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}
              className="dark:text-slate-400">
              When on, Get Number checks which services already hit the range you're entering. Turn off to skip that lookup.
            </p>
          </div>

          {/* FONT */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>FONT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2,
              background: 'var(--input-bg)', borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--border)' }}>
              {fonts.map(f => (
                <button key={f} onClick={() => setFont(f)}
                  style={{
                    padding: '12px 16px', border: 'none', cursor: 'pointer',
                    textAlign: 'center', fontSize: 14, fontWeight: font === f ? 800 : 500,
                    background: font === f ? accentColor : 'transparent',
                    color: font === f ? '#fff' : 'var(--text-secondary)',
                    fontFamily: f,
                    transition: 'all 0.15s',
                  }}
                  className={font !== f ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)',
          textAlign: 'center', flexShrink: 0, background: 'var(--input-bg)' }}>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>
            BITTX SMS ·{' '}
            <a href="https://t.me/bittxsmssupport" target="_blank" rel="noreferrer"
              style={{ color: accentColor }}>@bittxsmssupport</a>
          </p>
        </div>
      </div>
    </>
  )
}
