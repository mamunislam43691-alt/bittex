import { useState, useEffect, useCallback } from 'react'
import { Key, Copy, Check, Plus, Trash2, Eye, EyeOff, RefreshCw, AlertCircle, Shield } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { profileApi } from '../lib/api'
import { onDataUpdated } from '../lib/socket'
import ConfirmDialog from '../components/ConfirmDialog'

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
        fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0',
        background: copied ? '#dcfce7' : '#fff', color: copied ? '#16a34a' : '#475569', cursor: 'pointer' }}>
      {copied ? <Check size={11}/> : <Copy size={11}/>}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function ApiKeyAccess() {
  const { accentColor } = useTheme()
  const { user, refreshUser } = useAuth() as any
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [justCreated, setJustCreated] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const apiEnabled = user?.apiEnabled === true && user?.status === 'active'
  const hasKey = !!apiKey

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await profileApi.get()
      setApiKey(res?.user?.apiKey || null)
    } catch {}
  }, [])

  useEffect(() => {
    fetchApiKey()
    const unsub = onDataUpdated((data) => {
      if (data.type === 'users') fetchApiKey()
    })
    return unsub
  }, [fetchApiKey])

  // If API access is disabled, clear any existing key from local state so UI reflects deletion
  useEffect(() => {
    if (!apiEnabled && apiKey) {
      setApiKey(null)
      setShowKey(false)
    }
  }, [apiEnabled, apiKey])

  const handleCreate = async () => {
    setError('')
    if (!apiEnabled) {
      const isAgent = user?.role === 'agent'
      setError(isAgent
        ? 'API access is disabled. Please contact admin to enable API access.'
        : 'API access is disabled. Please contact your agent to enable API access.')
      return
    }
    setLoading(true)
    try {
      const res = await profileApi.genApiKey()
      setApiKey(res.apiKey)
      setShowKey(true)
      setJustCreated(true)
      refreshUser?.()
      setTimeout(() => setJustCreated(false), 5000)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate API key')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setError('')
    setLoading(true)
    try {
      await profileApi.deleteApiKey()
      setApiKey(null)
      setShowKey(false)
      refreshUser?.()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete API key')
    } finally {
      setLoading(false)
    }
  }

  const maskKey = (k: string) => k.slice(0, 8) + '•'.repeat(20) + k.slice(-6)

  if (!apiEnabled) {
    const isAgent = user?.role === 'agent'
    return (
      <div className="page-wrap">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Key size={22} style={{ color: accentColor }}/>
            <h1 className="page-title">API Key Access</h1>
          </div>
          <p className="page-sub">Manage your API keys for programmatic access.</p>
        </div>
        <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fef9c3',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} style={{ color: '#f59e0b' }}/>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {user?.status === 'pending' ? 'Account Pending Activation' : 'API Access Disabled'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.6 }}>
            {user?.status === 'pending'
              ? (isAgent
                  ? 'Your account is pending activation. Please contact the admin to activate your account before using API features.'
                  : 'Your account is pending activation. Please contact your agent to activate your account before using API features.')
              : (isAgent
                  ? 'Your API key access is currently disabled. Please contact the admin to enable API access for your account. Only the admin can enable or disable API access for agents.'
                  : 'Your API key access is currently disabled. Please contact your agent to enable API access for your account.')}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a' }}>
            <Shield size={14} style={{ color: '#f59e0b' }}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
              {user?.status === 'pending'
                ? (isAgent ? 'Contact admin to activate' : 'Contact your agent to activate')
                : (isAgent ? 'Contact admin to enable API access' : 'Contact your agent to enable')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Key size={22} style={{ color: accentColor }}/>
            <h1 className="page-title">API Key Access</h1>
          </div>
          <p className="page-sub">Manage your API key for programmatic access to BITTX SMS.</p>
        </div>
        {!hasKey && (
          <button onClick={handleCreate} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              fontSize: 13, fontWeight: 700, background: loading ? '#94a3b8' : accentColor, color: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer' }}>
            <Plus size={14}/> {loading ? 'Generating...' : 'Generate API Key'}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 18px',
        border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}/>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>Keep your API key secret</p>
          <p style={{ fontSize: 13, color: '#b45309', margin: 0, lineHeight: 1.5 }}>
            Never share your API key publicly. Treat it like a password. The key provides full access to your account via the API.
            You can delete it and generate a new one if it is compromised.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px',
          fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Keys list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!hasKey && (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <Key size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }}/>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No API key yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Generate your API key to get started.</p>
          </div>
        )}

        {hasKey && apiKey && (
          <div className="card" style={{ padding: '18px 22px', border: justCreated ? `1.5px solid ${accentColor}` : undefined }}>
            {justCreated && (
              <div style={{ background: '#dcfce7', borderRadius: 8, padding: '8px 14px',
                marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#15803d',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14}/> API key generated! Copy it now — it won't be shown in full again.
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accentColor}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Key size={16} style={{ color: accentColor }}/>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My API Key</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Use this key in the <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>x-api-key</code> header</p>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: '#dcfce7', color: '#16a34a', textTransform: 'uppercase' }}>● Active</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--input-bg)', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--border)', marginBottom: 12 }}>
              <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace',
                color: 'var(--text-primary)', wordBreak: 'break-all', overflowX: 'auto' }}>
                {showKey ? apiKey : maskKey(apiKey)}
              </code>
              <button onClick={() => setShowKey(s => !s)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '2px' }}>
                {showKey ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
              <CopyBtn text={apiKey}/>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(true)} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, border: '1px solid #fee2e2',
                  background: '#fff', color: '#ef4444', cursor: loading ? 'wait' : 'pointer' }}>
                <Trash2 size={11}/> Delete API Key
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete API Key?"
        message="Any apps currently using this API key will stop working immediately. This action cannot be undone."
        confirmLabel="Yes, Delete Key"
        cancelLabel="Cancel"
        confirmColor="#ef4444"
        icon={<Trash2 size={20} />}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
