import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Download, Plus, X, Eye, Copy, Check, RefreshCw, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { withdrawalsApi, withdrawalMethodsApi, adminApi, usersApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: string
  icon?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmColor = '#ef4444', icon, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: confirmColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon || <AlertTriangle size={22} color={confirmColor} />}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: confirmColor, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface WithdrawMethodData {
  _id: string; network: string; name: string; address: string
  minAmount: number; maxAmount: number; fee: number; active: boolean; createdAt?: string
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      title="Copy"
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0',
        background: copied ? '#dcfce7' : '#f8fafc', color: copied ? '#16a34a' : '#475569',
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
      {copied ? <Check size={11}/> : <Copy size={11}/>}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ViewWithdrawalModal({ w, onClose, onApprove, onReject }: {
  w: any; onClose: () => void; onApprove: () => void; onReject: () => void
}) {
  const fee = 0.50
  const youReceive = Math.max(0, w.amount - fee)
  const Row = ({ label, value, copy }: { label: string; value: string; copy?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: '#94a3b8', flexShrink: 0, minWidth: 120 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b',
          fontFamily: copy ? 'monospace' : undefined, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
        {copy && <CopyBtn text={value} />}
      </div>
    </div>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20,
        width: 520, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3e8ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💸</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Withdrawal Details</h3>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>ID: {w._id || w.id}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase',
              background: w.status === 'approved' ? '#dcfce7' : w.status === 'rejected' ? '#fee2e2' : '#fef9c3',
              color: w.status === 'approved' ? '#16a34a' : w.status === 'rejected' ? '#dc2626' : '#b45309' }}>{w.status}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
          </div>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', borderRadius: 14, padding: '18px 20px', marginBottom: 20,
            border: '1px solid #ddd6fe', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase',
              letterSpacing: '0.08em', margin: '0 0 4px' }}>WITHDRAWAL AMOUNT</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1 }}>${parseFloat(w.amount || 0).toFixed(2)}</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Fee: <strong style={{ color: '#ef4444' }}>${fee.toFixed(2)}</strong></span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Net: <strong style={{ color: '#16a34a' }}>${youReceive.toFixed(2)}</strong></span>
            </div>
          </div>
          <div>
            <Row label="User"       value={w.username || w.userId} />
            {w.userEmail && <Row label="User Email" value={w.userEmail} copy />}
            {w.agentEmail && <Row label="Agent Email" value={w.agentEmail} copy />}
            <Row label="Network"    value={w.network} />
            <Row label="Address"    value={w.address} copy />
            <Row label="TX ID"      value={w.txId || '—'} copy={!!w.txId} />
            <Row label="Requested"  value={w.requestedAt ? new Date(w.requestedAt).toLocaleString() : '—'} />
            <Row label="Processed"  value={w.processedAt ? new Date(w.processedAt).toLocaleString() : 'Not yet'} />
            <Row label="Amount"     value={`$${parseFloat(w.amount).toFixed(2)}`} />
            <Row label="Fee"        value={`$${fee.toFixed(2)}`} />
            <Row label="Net Payout" value={`$${youReceive.toFixed(2)}`} />
            {w.notes && <Row label="Notes" value={w.notes} />}
          </div>
        </div>
        <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Close</button>
          {w.status === 'pending' && (<>
            <button onClick={() => { onReject(); onClose() }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <XCircle size={14}/> Reject
            </button>
            <button onClick={() => { onApprove(); onClose() }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle size={14}/> Approve
            </button>
          </>)}
        </div>
      </div>
    </div>
  )
}

function WithdrawMethodModal({ onClose }: { onClose: () => void }) {
  const [methods, setMethods] = useState<WithdrawMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<WithdrawMethodData | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newNetwork, setNewNetwork] = useState('')
  const [newName, setNewName] = useState('')
  const [editMin, setEditMin] = useState('')
  const [editMax, setEditMax] = useState('')
  const [editFee, setEditFee] = useState('')

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 2500) }

  const fetchMethods = async () => {
    setLoading(true)
    try {
      const data = await withdrawalMethodsApi.listAll()
      setMethods(data?.methods || [])
    } catch { flash(false, 'Failed to load methods') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchMethods() }, [])

  const handleAdd = async () => {
    if (!newNetwork.trim() || !newName.trim()) return
    try {
      await withdrawalMethodsApi.create({
        network: newNetwork.trim(), name: newName.trim(), address: '',
        minAmount: 0.5, maxAmount: 500, fee: 0.5,
      })
      setNewNetwork(''); setNewName(''); setShowAdd(false)
      flash(true, 'Address added!')
      await fetchMethods()
    } catch (e: any) { flash(false, e.message) }
  }

  const startEdit = (m: WithdrawMethodData) => {
    setEditItem(m); setShowAdd(false)
    setEditMin(String(m.minAmount || 0.5))
    setEditMax(String(m.maxAmount || 500))
    setEditFee(String(m.fee || 0.5))
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      await withdrawalMethodsApi.update(editItem._id, {
        minAmount: parseFloat(editMin) || 0.5,
        maxAmount: parseFloat(editMax) || 500,
        fee: parseFloat(editFee) || 0.5,
      })
      setEditItem(null)
      flash(true, 'Updated!')
      await fetchMethods()
    } catch (e: any) { flash(false, e.message) }
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await withdrawalMethodsApi.remove(confirmDeleteId)
      flash(true, 'Address deleted!')
      await fetchMethods()
    } catch (e: any) { flash(false, e.message) }
    setConfirmDeleteId(null)
  }

  const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: 560, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Withdrawal Addresses — {methods.length} added</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msg && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#86efac' : '#fecaca'}`, color: msg.ok ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}

          {loading ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</p> : (
            methods.map(m => (
              <div key={m._id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 7px', borderRadius: 5 }}>{m.network}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{m.name}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                      Min: ${m.minAmount} · Max: ${m.maxAmount} · Fee: ${m.fee}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => startEdit(m)} title="Edit limits"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(m._id)} title="Delete"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {editItem?._id === m._id && (
                  <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: 0 }}>EDIT LIMITS — {m.name}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div><label style={labelS}>MIN ($)</label>
                        <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} style={inputS} /></div>
                      <div><label style={labelS}>MAX ($)</label>
                        <input type="number" value={editMax} onChange={e => setEditMax(e.target.value)} style={inputS} /></div>
                      <div><label style={labelS}>FEE ($)</label>
                        <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} style={inputS} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditItem(null)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleUpdate}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {!loading && methods.length === 0 && !showAdd && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 13 }}>
              No withdrawal addresses configured yet.
            </div>
          )}

          {showAdd && (
            <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #7c3aed40', background: '#faf5ff', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelS}>NETWORK *</label>
                  <input value={newNetwork} onChange={e => setNewNetwork(e.target.value)}
                    placeholder="e.g. USDT TRC20, Bitcoin, BSC..." style={inputS} /></div>
                <div><label style={labelS}>METHOD NAME *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. USDT SOL" style={inputS} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setNewNetwork(''); setNewName('') }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleAdd}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>Add Address</button>
              </div>
            </div>
          )}

          {!showAdd && !editItem && (
            <button onClick={() => setShowAdd(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', justifyContent: 'center' }}>
              <Plus size={14} /> Add New Address
            </button>
          )}

          <ConfirmDialog open={!!confirmDeleteId} title="Delete Address?"
            message={`This will permanently remove "${methods.find(m => m._id === confirmDeleteId)?.name || ''}" and any references to it in user panels.`}
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDeleteId(null)} />
        </div>
      </div>
    </div>
  )
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [showMethodModal, setShowMethodModal] = useState(false)
  const [viewItem, setViewItem] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmApproveAll, setConfirmApproveAll] = useState(false)

  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch withdrawals and users in parallel
      const [data, usersRes] = await Promise.allSettled([
        withdrawalsApi.list(),
        usersApi.list(),
      ])

      const wds = data.status === 'fulfilled' ? (data.value?.withdrawals || data.value || []) : []
      const list = Array.isArray(wds) ? wds : []

      // Enrich with user email + agent email
      if (usersRes.status === 'fulfilled') {
        const usersList: any[] = usersRes.value?.users || []
        const userMap = new Map(usersList.map((u: any) => [String(u._id || u.id), u]))
        const enriched = list.map((w: any) => {
          const user: any = userMap.get(String(w.userId))
          return {
            ...w,
            userEmail: user?.email || '',
            agentEmail: user?.agentEmail || '',
          }
        })
        setWithdrawals(enriched)
      } else {
        setWithdrawals(list)
      }
    } catch (err: any) {
      flash(false, 'Failed to load withdrawals: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWithdrawals() }, [fetchWithdrawals])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'withdrawals') fetchWithdrawals()
    })
    return unsub
  }, [])

  const approve = async (id: string) => {
    setActionLoading(id)
    try {
      await withdrawalsApi.process(id, 'approved')
      setWithdrawals(prev => prev.map(w => (w._id||w.id)===id ? {...w, status:'approved', processedAt:new Date().toISOString()} : w))
      flash(true, 'Withdrawal approved!')
    } catch (e:any) { flash(false, e.message) } finally { setActionLoading(null) }
  }

  const reject = async (id: string) => {
    setActionLoading(id)
    try {
      await withdrawalsApi.process(id, 'rejected')
      setWithdrawals(prev => prev.map(w => (w._id||w.id)===id ? {...w, status:'rejected', processedAt:new Date().toISOString()} : w))
      flash(true, 'Withdrawal rejected.')
    } catch (e:any) { flash(false, e.message) } finally { setActionLoading(null) }
  }

  const approveAll = async () => {
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length
    if (pendingCount === 0) { flash(false, 'No pending withdrawals to approve'); return }
    setConfirmApproveAll(true)
  }
  const doApproveAll = async () => {
    setConfirmApproveAll(false)
    try {
      await withdrawalsApi.approveAll()
      await fetchWithdrawals()
      flash(true, 'All pending withdrawals approved!')
    } catch (e:any) { flash(false, e.message) }
  }

  const clearProcessed = async () => {
    const processed = withdrawals.filter(w => w.status === 'approved' || w.status === 'rejected')
    if (processed.length === 0) { flash(false, 'No processed withdrawals to clear'); return }
    setConfirmClear(true)
  }
  const doClearProcessed = async () => {
    setConfirmClear(false)
    try {
      await withdrawalsApi.clearProcessed()
      await fetchWithdrawals()
      flash(true, 'Processed withdrawals cleared!')
    } catch (e:any) { flash(false, e.message) }
  }

  const filtered = withdrawals.filter(w => filter === 'all' || w.status === filter)
  const pending  = withdrawals.filter(w => w.status === 'pending')
  const totalPending = pending.reduce((s,w) => s + parseFloat(w.amount||0), 0)

  const handleExport = () => { window.open(adminApi.exportDatabase(), '_blank') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ConfirmDialog open={confirmApproveAll} title="Approve All Pending?"
        message={`Approve ALL ${withdrawals.filter(w=>w.status==='pending').length} pending withdrawals? This action cannot be undone.`}
        confirmLabel="Approve All" confirmColor="#22c55e" onConfirm={doApproveAll} onCancel={()=>setConfirmApproveAll(false)} />
      <ConfirmDialog open={confirmClear} title="Clear Processed Withdrawals?"
        message={`Delete ${withdrawals.filter(w=>w.status==='approved'||w.status==='rejected').length} processed withdrawals (approved + rejected)?\n\nPending withdrawals will NOT be affected.`}
        confirmLabel="Clear Processed" confirmColor="#ef4444"
        icon={<Trash2 size={22} color="#ef4444" />}
        onConfirm={doClearProcessed} onCancel={()=>setConfirmClear(false)} />
      {showMethodModal && <WithdrawMethodModal onClose={()=>setShowMethodModal(false)}/>}
      {viewItem && (
        <ViewWithdrawalModal w={viewItem} onClose={() => setViewItem(null)}
          onApprove={() => { approve(viewItem._id||viewItem.id); setViewItem(null) }}
          onReject={() => { reject(viewItem._id||viewItem.id); setViewItem(null) }} />
      )}

      {msg && (
        <div style={{padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,
          background:msg.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${msg.ok?'#86efac':'#fecaca'}`,
          color:msg.ok?'#16a34a':'#dc2626'}}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Withdrawals</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {pending.length} pending · ${totalPending.toFixed(2)} total pending amount
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchWithdrawals} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, fontSize:13, fontWeight:600, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer' }}>
            <RefreshCw size={14} style={{animation:loading?'spin 0.8s linear infinite':'none'}}/> Refresh
          </button>
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
            <Download size={14}/> Export
          </button>
          <button onClick={approveAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <CheckCircle size={14}/> Approve All
          </button>
          <button onClick={clearProcessed}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={14}/> Clear Processed
          </button>
          <button onClick={()=>setShowMethodModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14}/> Withdraw Method
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Pending',  count: withdrawals.filter(w=>w.status==='pending').length,  amount: withdrawals.filter(w=>w.status==='pending').reduce((s,w)=>s+parseFloat(w.amount||0),0),  color: '#f59e0b' },
          { label: 'Approved', count: withdrawals.filter(w=>w.status==='approved').length, amount: withdrawals.filter(w=>w.status==='approved').reduce((s,w)=>s+parseFloat(w.amount||0),0), color: '#22c55e' },
          { label: 'Rejected', count: withdrawals.filter(w=>w.status==='rejected').length, amount: withdrawals.filter(w=>w.status==='rejected').reduce((s,w)=>s+parseFloat(w.amount||0),0), color: '#ef4444' },
          { label: 'Total',    count: withdrawals.length, amount: withdrawals.reduce((s,w)=>s+parseFloat(w.amount||0),0), color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: `1px solid ${s.color}30` }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.color, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1 }}>{s.count}</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>${s.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#fff', padding: 6, borderRadius: 12, border: '1px solid #e2e8f0', width: 'fit-content' }}>
        {(['all','pending','approved','rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? '#7c3aed' : 'transparent', color: filter === f ? '#fff' : '#64748b' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['User', 'Amount', 'Network', 'Address', 'Requested', 'Processed', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 18px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((w: any) => {
              const wid = w._id || w.id
              return (
                <tr key={wid} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50 transition-colors">
                  <td style={{ padding: '13px 18px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{w.username || w.userId}</td>
                  <td style={{ padding: '13px 18px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>${parseFloat(w.amount||0).toFixed(2)}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#f3e8ff', color: '#7c3aed' }}>{w.network}</span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 11, fontFamily: 'monospace', color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.address}</span>
                      <button onClick={() => navigator.clipboard.writeText(w.address)} title="Copy address"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <Copy size={11}/>
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {w.processedAt ? new Date(w.processedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase',
                      background: w.status === 'approved' ? '#dcfce7' : w.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                      color: w.status === 'approved' ? '#16a34a' : w.status === 'rejected' ? '#dc2626' : '#b45309' }}>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    {w.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setViewItem(w)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
                          <Eye size={11}/> View
                        </button>
                        <button onClick={() => approve(wid)} disabled={actionLoading===wid}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          <CheckCircle size={12}/> Approve
                        </button>
                        <button onClick={() => reject(wid)} disabled={actionLoading===wid}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                          <XCircle size={12}/> Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewItem(w)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                          <Eye size={11}/> View
                        </button>
                        <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>Processed</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#22c55e' }}/>
            <p style={{ fontSize: 14 }}>No {filter} withdrawals</p>
          </div>
        )}
        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        )}
      </div>
    </div>
  )
}
