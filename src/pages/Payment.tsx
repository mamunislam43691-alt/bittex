import { useState, useEffect } from 'react'
import { AlertCircle, DollarSign, ArrowDownCircle, Clock, Check, Eye, Trash2, Copy, X, ShieldCheck, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { sendVerificationEmail, verifyOTPRemote } from '../lib/emailService'
import { withdrawalsApi, withdrawalMethodsApi, profileApi } from '../lib/api'

const MIN_WITHDRAW = 0.50
const FEE = 0.50

interface SavedAddress {
  id: string
  network: string
  name: string
  address: string
  cryptoBanConfirm: string
  addedAt: string
}

interface HistoryEntry {
  id: string
  date: string
  method: string
  details: string
  amount: string
  txId: string
  status: 'Pending' | 'Completed' | 'Failed'
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
        background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
      {copied ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} style={{ color: '#94a3b8' }} />}
    </button>
  )
}

interface ViewModalProps { addr: SavedAddress; onClose: () => void; onDelete: (id: string) => void }
function ViewModal({ addr, onClose, onDelete }: ViewModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '95vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        className="dark:bg-slate-900">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }} className="dark:border-slate-800">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }} className="dark:text-white">
              {addr.network}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} style={{ color: '#94a3b8' }} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'YOUR NAME',    value: addr.name },
            { label: `${addr.network || 'CRYPTO'} ADDRESS`, value: addr.address },
            { label: 'ARE YOU SURE YOU ARE NOT A RESIDENT OF A CRYPTO-BANNED COUNTRY?', value: addr.cryptoBanConfirm },
            { label: 'ADDED',        value: addr.addedAt, noCopy: true },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#94a3b8', width: 200, flexShrink: 0, lineHeight: 1.6 }}>
                {row.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
                  padding: '3px 10px', fontFamily: 'monospace' }} className="dark:text-slate-300">
                  {row.value}
                </span>
                {!row.noCopy && <CopyBtn text={row.value} />}
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
          padding: '14px 22px', borderTop: '1px solid #f1f5f9' }} className="dark:border-slate-800">
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}
            className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Close</button>
          <button onClick={() => { onDelete(addr.id); onClose() }}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Payment() {
  const { accentColor } = useTheme()
  const { user, refreshUser } = useAuth()

  // Payment Addresses state
  const [addrNetwork,     setAddrNetwork]     = useState('USDT SOL Network')
  const [addrName,        setAddrName]        = useState('')
  const [addrSol,         setAddrSol]         = useState('')
  const [addrCryptoBan,   setAddrCryptoBan]   = useState('')
  const [addrConfirmed,   setAddrConfirmed]   = useState(false)
  const [savedAddresses,  setSavedAddresses]  = useState<SavedAddress[]>([])
  const [viewAddr,        setViewAddr]        = useState<SavedAddress | null>(null)
  const [availableNetworks, setAvailableNetworks] = useState<string[]>(['USDT SOL Network', 'USDT TRC20', 'USDT ERC20'])
  const [methodsByNet, setMethodsByNet] = useState<Record<string, { min: number; max: number; fee: number; name: string }>>({})

  // Withdraw state
  const [withdrawAddrId,  setWithdrawAddrId]  = useState('')
  const [withdrawAmount,  setWithdrawAmount]  = useState('')
  const [history,         setHistory]         = useState<HistoryEntry[]>([])
  const [withdrawError,   setWithdrawError]   = useState('')

  // 2-step payment OTP state
  const [showWithdrawOtp, setShowWithdrawOtp] = useState(false)
  const [otpDigits,       setOtpDigits]       = useState<string[]>(['','','','','',''])
  const [otpStatus,       setOtpStatus]       = useState<'idle'|'invalid'|'expired'>('idle')
  const [otpLoading,      setOtpLoading]      = useState(false)
  const [otpSending,      setOtpSending]      = useState(false)
  const [otpSent,         setOtpSent]         = useState(false)
  const [resendT,         setResendT]         = useState(0)
  const [devMode,         setDevMode]         = useState(false)
  const [pendingEntry,    setPendingEntry]     = useState<HistoryEntry | null>(null)

  const balance = user?.balance || 0

  useEffect(() => {
    if (!user) return
    // Clean up any stale localStorage data from old version
    try { localStorage.removeItem(`bittx_addrs_${user.id}`) } catch {}

    // Load all 3 data sources in parallel
    Promise.allSettled([
      withdrawalsApi.list(),
      withdrawalMethodsApi.list(),
      profileApi.get(),
    ]).then(([historyRes, methodsRes, profileRes]) => {
      // 1. Withdrawal history
      if (historyRes.status === 'fulfilled') {
        const data = historyRes.value
        const wds = data?.withdrawals || data || []
        if (Array.isArray(wds)) {
          setHistory(wds.map((w: any) => ({
            id: w._id || w.id,
            date: w.requestedAt ? new Date(w.requestedAt).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : '',
            method: w.network || '',
            details: (w.address || '').slice(0, 16) + '...',
            amount: `$${parseFloat(w.amount || 0).toFixed(2)}`,
            txId: w._id || w.id || '',
            status: w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Failed' : 'Pending',
          })))
        }
      }
      // 2. Withdrawal methods (networks)
      if (methodsRes.status === 'fulfilled') {
        const data = methodsRes.value
        const methods = data?.methods || []
        const nets = methods.map((m: any) => m.network)
        if (nets.length > 0) {
          const unique = [...new Set(nets)] as string[]
          setAvailableNetworks(unique)
          if (!unique.includes(addrNetwork)) setAddrNetwork(unique[0])
        }
        const map: Record<string, { min: number; max: number; fee: number; name: string }> = {}
        methods.forEach((m: any) => {
          if (!map[m.network]) {
            map[m.network] = { min: m.minAmount ?? 0.5, max: m.maxAmount ?? 500, fee: m.fee ?? 0.5, name: m.name }
          } else {
            map[m.network].min = Math.min(map[m.network].min, m.minAmount ?? 0.5)
            map[m.network].max = Math.max(map[m.network].max, m.maxAmount ?? 500)
            map[m.network].fee = Math.min(map[m.network].fee, m.fee ?? 0.5)
          }
        })
        setMethodsByNet(map)
      }
      // 3. Saved addresses from profile
      if (profileRes.status === 'fulfilled') {
        const res = profileRes.value
        if (res?.user?.savedAddresses?.length) {
          setSavedAddresses(res.user.savedAddresses)
        }
      }
    }).catch(() => {})
  }, [user])

  const is2StepPayments = !!(user as any)?.twoFAPayments

  const persistAddresses = async (addrs: SavedAddress[]) => {
    // Save to DB only
    try { await profileApi.update({ savedAddresses: addrs }) } catch {}
  }

  const handleSaveAddr = () => {
    if (!addrName || !addrSol || !addrCryptoBan || !addrConfirmed) return
    const now = new Date()
    const newAddr: SavedAddress = {
      id: Date.now().toString(),
      network: addrNetwork,
      name: addrName,
      address: addrSol,
      cryptoBanConfirm: addrCryptoBan,
      addedAt: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    }
    const next = [...savedAddresses, newAddr]
    setSavedAddresses(next)
    persistAddresses(next)
    setAddrName(''); setAddrSol(''); setAddrCryptoBan(''); setAddrConfirmed(false)
  }

  const handleDeleteAddr = (id: string) => {
    const next = savedAddresses.filter(a => a.id !== id)
    setSavedAddresses(next)
    persistAddresses(next)
    if (withdrawAddrId === id) setWithdrawAddrId('')
  }

  const selectedAddr = savedAddresses.find(a => a.id === withdrawAddrId)
  const amount = parseFloat(withdrawAmount) || 0
  // Use the selected saved address network → method settings, fallback to defaults
  const activeNetSettings = selectedAddr && methodsByNet[selectedAddr.network]
  const activeFee    = activeNetSettings?.fee ?? FEE
  const activeMin    = activeNetSettings?.min ?? MIN_WITHDRAW
  const activeMax    = activeNetSettings?.max ?? 500
  const youReceive   = Math.max(0, amount - activeFee)

  const buildEntry = (): HistoryEntry => {
    const now = new Date()
    return {
      id: Date.now().toString(),
      date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      method: selectedAddr!.network,
      details: selectedAddr!.address.slice(0, 16) + '...',
      amount: `$${amount.toFixed(2)}`,
      txId: 'Pending...',
      status: 'Pending',
    }
  }

  const submitWithdraw = async (entry: HistoryEntry) => {
    try {
      await withdrawalsApi.create(amount, selectedAddr!.network, selectedAddr!.address)
      setHistory(prev => [entry, ...prev])
      setWithdrawAmount('')
      setWithdrawAddrId('')
      if (refreshUser) await refreshUser()
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal')
    }
  }

  const sendOtpForWithdraw = async () => {
    if (!user) return
    setOtpSending(true)
    await sendVerificationEmail(user.email, user.firstName || '', '', 'verify')
    setOtpSending(false); setOtpSent(true)
    const local = sessionStorage.getItem(`otp_${user.email}`)
    if (local) setDevMode(true)
    setResendT(60)
    const t = setInterval(() => setResendT(s => { if(s<=1){clearInterval(t);return 0} return s-1 }), 1000)
  }

  const handleWithdraw = async () => {
    setWithdrawError('')
    if (!withdrawAddrId) { setWithdrawError('Please select a payment address.'); return }
    if (amount < activeMin) { setWithdrawError(`Minimum withdrawal is $${activeMin.toFixed(2)}.`); return }
    if (activeMax && amount > activeMax) { setWithdrawError(`Maximum withdrawal is $${activeMax.toFixed(2)}.`); return }
    if (amount > balance) { setWithdrawError('Insufficient balance.'); return }

    const entry = buildEntry()

    if (is2StepPayments) {
      // Show OTP modal
      setPendingEntry(entry)
      setShowWithdrawOtp(true)
      setOtpDigits(['','','','','','']); setOtpStatus('idle'); setOtpSent(false)
      await sendOtpForWithdraw()
    } else {
      submitWithdraw(entry)
    }
  }

  const handleOtpChange = (i: number, v: string) => {
    const val = v.replace(/\D/g,'').slice(-1)
    const next = [...otpDigits]; next[i] = val; setOtpDigits(next); setOtpStatus('idle')
    if (val && i < 5) document.getElementById(`pay-otp-${i+1}`)?.focus()
  }
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) document.getElementById(`pay-otp-${i-1}`)?.focus()
  }
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (p.length === 6) { setOtpDigits(p.split('')); setOtpStatus('idle') }
    e.preventDefault()
  }
  const handleOtpVerify = async () => {
    const otp = otpDigits.join('')
    if (otp.length !== 6 || !user) return
    setOtpLoading(true)
    const r = await verifyOTPRemote(user.email, otp)
    if (r === 'valid') {
      if (pendingEntry) { submitWithdraw(pendingEntry); setPendingEntry(null) }
      setShowWithdrawOtp(false)
    } else {
      setOtpStatus(r === 'expired' ? 'expired' : 'invalid')
    }
    setOtpLoading(false)
  }

  const inputCls = "w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"

  return (
    <div className="page-wrap">
      {viewAddr && <ViewModal addr={viewAddr} onClose={() => setViewAddr(null)} onDelete={handleDeleteAddr} />}

      {/* 2-Step Withdrawal OTP Modal */}
      {showWithdrawOtp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setShowWithdrawOtp(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20,
            width:360, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#0369a1,#0ea5e9)',
              padding:'20px 22px', textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                <ShieldCheck size={24} color="#fff"/>
              </div>
              <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:0 }}>Verify Withdrawal</h3>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.8)', margin:'4px 0 0' }}>
                2-Step Verification required
              </p>
            </div>
            <div style={{ padding:'20px 22px' }}>
              {otpSending && (
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, marginBottom:14 }}>
                  <div style={{ width:18, height:18, border:'2.5px solid #0ea5e9', borderTopColor:'transparent',
                    borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }}/>
                  Sending code to your email...
                </div>
              )}
              {otpSent && !otpSending && (
                <p style={{ textAlign:'center', fontSize:13, color:'#64748b', marginBottom:14 }}>
                  Code sent to <strong style={{ color:'#0ea5e9' }}>{user?.email}</strong>
                </p>
              )}
              {devMode && (
                <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8,
                  padding:'8px 12px', marginBottom:12, fontSize:11, color:'#92400e' }}>
                  🛠 Dev — Use: <code style={{ fontWeight:900, fontSize:14, letterSpacing:'0.2em' }}>123456</code>
                </div>
              )}
              <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:14 }}>
                {otpDigits.map((d,i) => (
                  <input key={i} id={`pay-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={e=>handleOtpChange(i,e.target.value)}
                    onKeyDown={e=>handleOtpKeyDown(i,e)} onPaste={i===0?handleOtpPaste:undefined}
                    style={{ width:42, height:50, textAlign:'center', fontSize:22, fontWeight:800,
                      borderRadius:10, outline:'none', boxSizing:'border-box',
                      border:`2px solid ${otpStatus==='invalid'||otpStatus==='expired'?'#ef4444':d?'#0ea5e9':'#e2e8f0'}`,
                      background: otpStatus==='invalid'?'#fef2f2':'#fff', color:'#1e293b' }}/>
                ))}
              </div>
              {otpStatus==='invalid' && <p style={{ textAlign:'center', color:'#dc2626', fontSize:12, fontWeight:700, marginBottom:8 }}>✕ Incorrect code</p>}
              {otpStatus==='expired' && <p style={{ textAlign:'center', color:'#f59e0b', fontSize:12, fontWeight:700, marginBottom:8 }}>⏰ Code expired</p>}
              <button onClick={handleOtpVerify} disabled={otpDigits.join('').length<6||otpLoading}
                style={{ width:'100%', padding:'11px', borderRadius:11, fontSize:14, fontWeight:700, marginBottom:12,
                  background: otpDigits.join('').length<6||otpLoading?'#e2e8f0':'linear-gradient(135deg,#0369a1,#0ea5e9)',
                  color: otpDigits.join('').length<6||otpLoading?'#94a3b8':'#fff', border:'none',
                  cursor: otpDigits.join('').length<6||otpLoading?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {otpLoading ? <><div style={{ width:15,height:15,border:'2.5px solid #94a3b8',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> Verifying...</> : <><ShieldCheck size={15}/> Confirm Withdrawal</>}
              </button>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button onClick={()=>setShowWithdrawOtp(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#94a3b8', fontWeight:600 }}>Cancel</button>
                {resendT > 0
                  ? <span style={{ fontSize:12, color:'#94a3b8' }}>Resend in {resendT}s</span>
                  : <button onClick={sendOtpForWithdraw} style={{ background:'none', border:'none', cursor:'pointer', color:'#0ea5e9', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}><RefreshCw size={11}/> Resend</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page title */}
      <div>
        <h1 className="page-title">Payments</h1>
        <p className="page-sub">Manage payout methods, withdrawals, and view your transaction history.</p>
      </div>

      {/* Notices */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }} className="dark:border-slate-800">
          <AlertCircle size={15} style={{ color: '#f59e0b' }} />
          <h2 className="card-title">Payment Notices &amp; Limits</h2>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={18} style={{ color: '#b45309' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>USDT SOL Network</p>
              <ul style={{ fontSize: 13, color: '#b45309', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                <li>• Min: <strong>$0.5</strong> &nbsp; Max: <strong>$500</strong></li>
                <li>• USDT on Solana — fast settlement, low network fees.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Available Balance */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>AVAILABLE BALANCE</p>
          <p className="mask-num dark:text-white" style={{ fontSize: 36, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>${balance.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>USDT · SOL Network</p>
        </div>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={28} style={{ color: accentColor }} />
        </div>
      </div>

      {/* Payment Addresses + Withdraw */}
      <div className="payment-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Payment Addresses */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }} className="dark:border-slate-800">
            <span style={{ fontSize: 16 }}>💳</span>
            <div>
              <h3 className="card-title">Payment Addresses</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Save the wallets / mobile-money accounts you want to withdraw to.</p>
            </div>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>ADD NEW ADDRESS</label>
              <select value={addrNetwork} onChange={e => setAddrNetwork(e.target.value)} className={inputCls} style={{ marginBottom: 10 }}>
                {availableNetworks.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>YOUR NAME *</label>
              <input value={addrName} onChange={e => setAddrName(e.target.value)} placeholder="Your Name" className={inputCls} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>{addrNetwork || 'CRYPTO'} ADDRESS *</label>
              <input value={addrSol} onChange={e => setAddrSol(e.target.value)} placeholder={`${addrNetwork || 'Crypto'} wallet address`} className={inputCls} style={{ fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>ARE YOU SURE YOU ARE NOT A RESIDENT OF A CRYPTO-BANNED COUNTRY? *</label>
              <input value={addrCryptoBan} onChange={e => setAddrCryptoBan(e.target.value)} placeholder="Are you sure you are not a resident of a crypto-banned country?" className={inputCls} />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <div onClick={() => setAddrConfirmed(v => !v)} style={{ width: 16, height: 16, borderRadius: 4, marginTop: 1, flexShrink: 0, border: `2px solid ${addrConfirmed ? accentColor : '#cbd5e1'}`, background: addrConfirmed ? accentColor : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {addrConfirmed && <Check size={10} color="#fff" />}
              </div>
              <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>I confirm I am not a resident of a crypto-banned country and accept the payment terms.</span>
            </label>
            <button onClick={handleSaveAddr} disabled={!addrName || !addrSol || !addrCryptoBan || !addrConfirmed}
              style={{ width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: addrName && addrSol && addrCryptoBan && addrConfirmed ? accentColor : '#e2e8f0', color: addrName && addrSol && addrCryptoBan && addrConfirmed ? '#fff' : '#94a3b8', border: 'none', cursor: addrName && addrSol && addrCryptoBan && addrConfirmed ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
              Save Address
            </button>

            {/* Saved address list */}
            {savedAddresses.map(addr => (
              <div key={addr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }} className="dark:bg-slate-800 dark:border-slate-700">
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }} className="dark:text-slate-200">{addr.network}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{addr.name} · {addr.address.slice(0,12)}...</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setViewAddr(addr)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }} className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                    <Eye size={13} /> View
                  </button>
                  <button onClick={() => handleDeleteAddr(addr.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={14} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              </div>
            ))}
            {savedAddresses.length === 0 && (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>No saved addresses yet.</p>
            )}
          </div>
        </div>

        {/* Withdraw */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }} className="dark:border-slate-800">
            <span style={{ fontSize: 16 }}>💸</span>
            <div>
              <h3 className="card-title">Withdraw</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Pick one of your saved payment addresses and enter an amount.</p>
            </div>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>PAYMENT ADDRESS</label>
              <select value={withdrawAddrId} onChange={e => setWithdrawAddrId(e.target.value)} className={inputCls}>
                <option value="">Add an address first</option>
                {savedAddresses.map(a => (
                  <option key={a.id} value={a.id}>{a.network} — {a.name}</option>
                ))}
              </select>
              {savedAddresses.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Add a payment address first</p>}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
                  AMOUNT (Min: ${activeMin.toFixed(2)} · Max: ${activeMax.toFixed(2)})
                </label>
                <button onClick={() => setWithdrawAmount(Math.min(balance, activeMax).toFixed(2))} style={{ fontSize: 12, fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Use max (${Math.min(balance, activeMax).toFixed(2)})
                </button>
              </div>
              <input type="number" value={withdrawAmount} onChange={e => { setWithdrawAmount(e.target.value); setWithdrawError('') }} placeholder="0.00" min={activeMin} max={activeMax} step="0.50" className={inputCls} />
            </div>

            {/* Fee breakdown */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }} className="dark:bg-slate-800">
              {[['Amount', `$${amount.toFixed(2)}`], ['Network Fee', `-$${activeFee.toFixed(2)}`], ['You Receive', `$${youReceive.toFixed(2)}`]].map(([label, val], i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderTop: i === 2 ? '1px solid #e2e8f0' : 'none', paddingTop: i === 2 ? 8 : 0 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: i === 2 ? 700 : 400 }} className="dark:text-slate-400">{label}</span>
                  <span style={{ fontSize: 13, fontWeight: i === 2 ? 800 : 600, color: i === 2 ? '#1e293b' : '#475569' }} className={i === 2 ? 'dark:text-white' : 'dark:text-slate-300'}>{val}</span>
                </div>
              ))}
            </div>

            {withdrawError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{withdrawError}</p>}

            <button onClick={handleWithdraw} disabled={!withdrawAddrId || amount < activeMin || amount > balance || (activeMax ? amount > activeMax : false)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: (withdrawAddrId && amount >= MIN_WITHDRAW && amount <= balance) ? accentColor : '#e2e8f0', color: (withdrawAddrId && amount >= MIN_WITHDRAW && amount <= balance) ? '#fff' : '#94a3b8', border: 'none', cursor: (withdrawAddrId && amount >= MIN_WITHDRAW && amount <= balance) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ArrowDownCircle size={16} /> Withdraw Now
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }} className="dark:border-slate-800">
          <Clock size={15} className="text-slate-400" />
          <h3 className="card-title">History</h3>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <DollarSign size={32} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, color: '#94a3b8' }}>No transaction history yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr 100px 160px 80px', padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }} className="dark:bg-slate-800/40 dark:border-slate-800">
              {['DATE', 'METHOD', 'DETAILS', 'AMOUNT', 'TX ID', 'STATUS'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>{h}</span>
              ))}
            </div>
            {history.map(h => (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr 100px 160px 80px', padding: '14px 20px', borderBottom: '1px solid #f8fafc', alignItems: 'center', gap: 8 }} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 dark:border-slate-800/40">
                <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }} className="dark:text-slate-300">{h.date}</span>
                <span style={{ fontSize: 13, color: '#374151' }} className="dark:text-slate-300">{h.method}</span>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.details}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }} className="dark:text-white">{h.amount}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.txId}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: h.status === 'Completed' ? '#dcfce7' : h.status === 'Failed' ? '#fee2e2' : '#fef9c3', color: h.status === 'Completed' ? '#16a34a' : h.status === 'Failed' ? '#dc2626' : '#b45309', display: 'inline-block' }}>
                  {h.status}
                </span>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
