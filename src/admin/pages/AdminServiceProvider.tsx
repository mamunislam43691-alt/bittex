import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, Copy, Check, ChevronDown, Key, Eye, EyeOff,
  RefreshCw, Hash, Edit2, X, Save, Globe, Search, Info, Link,
  Zap, List, ToggleLeft, ToggleRight, Star, AlertTriangle, Terminal, Play } from 'lucide-react'
import { COUNTRIES } from '../../lib/countries'
import { spApi, api } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

// ── Types ──────────────────────────────────────────────────────────────
interface BaseUrl {
  _id?: string
  label: string
  numberFetchUrl: string
  liveCheckUrl: string
  otpReceiveUrl: string
  apiKey: string
  active: boolean
  extraUrls: { label: string; url: string }[]
}

interface RangeSlot {
  _id?: string
  range: string
  priority: number
  active: boolean
  successCount: number
  pricePerOtp?: number | null
}

interface NumEntry {
  _id?: string
  id?: string
  number: string
  range: string
  used: boolean
}

interface Provider {
  _id?: string
  id?: string
  country: string
  service: string
  services: string[]
  numbers: NumEntry[]
  extApiKey: string
  extBaseUrl: string
  baseUrls: BaseUrl[]
  ranges: RangeSlot[]
  autoRangeEnabled: boolean
  numberInputMode: 'manual' | 'auto'
  active: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────
function numToRange(num: string): string {
  const clean = num.replace(/\D/g, '')
  if (clean.length < 7) return ''
  return clean.slice(0, Math.max(7, clean.length - 3)) + 'XXX'
}

function pid(p: Provider | null | undefined) { return p?._id || p?.id || '' }

const POPULAR_SERVICES = [
  'Facebook','WhatsApp','Telegram','Google','Instagram','TikTok',
  'Twitter/X','Snapchat','Discord','LinkedIn','Uber','PayPal',
  'Binance','Coinbase','Netflix','Spotify','Amazon','Alibaba','Custom...',
]

const inp: React.CSSProperties = {
  width:'100%', padding:'9px 12px', fontSize:13, borderRadius:8,
  border:'1px solid #e2e8f0', background:'#f8fafc', color:'#1e293b',
  outline:'none', boxSizing:'border-box',
}
const lbl: React.CSSProperties = {
  fontSize:10, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'0.07em', color:'#94a3b8', display:'block', marginBottom:5,
}

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(()=>setC(false),1400) }}
      style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6,
        fontSize:11, fontWeight:600, border:'1px solid #e2e8f0',
        background:c?'#dcfce7':'#fff', color:c?'#16a34a':'#475569', cursor:'pointer' }}>
      {c?<Check size={10}/>:<Copy size={10}/>} {c?'Copied':'Copy'}
    </button>
  )
}

function RangeBadge({ range }: { range: string }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  if (!range) return null
  return (
    <span
      onClick={() => { navigator.clipboard.writeText(range).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
        cursor: 'pointer', userSelect: 'none',
        background: copied ? '#dcfce7' : hovered ? '#ede9fe' : '#f5f3ff',
        color: copied ? '#16a34a' : '#7c3aed',
        fontFamily: 'monospace', border: `1px solid ${copied ? '#86efac' : '#ddd6fe'}`,
        display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
      }}>
      {copied ? <Check size={9}/> : <Hash size={9}/>} {range}
      {hovered && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.92)', color: '#fff',
          fontSize: 10, fontWeight: 600, padding: '3px 8px',
          borderRadius: 5, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 200,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {copied ? '✓ Copied!' : '📋 Click to copy range'}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
            borderTop: '4px solid rgba(15,23,42,0.92)',
          }} />
        </span>
      )}
    </span>
  )
}

// ── Country Picker ────────────────────────────────────────────────────
function AdminCountryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const filtered = query.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.dialCode.includes(query))
    : COUNTRIES
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])
  const selected = COUNTRIES.find(c => c.name === value)
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(v=>!v)}
        style={{ ...inp, display:'flex', alignItems:'center', gap:8, cursor:'pointer', paddingRight:32, textAlign:'left' }}>
        {selected ? <>
          <span style={{ fontSize:16, flexShrink:0 }}>{selected.flag}</span>
          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.name}</span>
          <span style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{selected.dialCode}</span>
        </> : <span style={{ color:'#94a3b8', flex:1 }}>Select country...</span>}
      </button>
      <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:`translateY(-50%) rotate(${open?180:0}deg)`, color:'#94a3b8', pointerEvents:'none', transition:'transform 0.2s' }}/>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:9999,
          background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
          boxShadow:'0 8px 32px rgba(0,0,0,0.14)', overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9', position:'relative' }}>
            <Search size={12} style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input ref={inputRef} type="text" value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Search country..."
              style={{ width:'100%', paddingLeft:26, paddingRight:8, paddingTop:6, paddingBottom:6,
                fontSize:12, borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#1e293b', outline:'none', boxSizing:'border-box' as const }}/>
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filtered.map(c => (
              <button key={c.code} type="button"
                onClick={() => { onChange(c.name); setOpen(false); setQuery('') }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                  fontSize:12, border:'none', cursor:'pointer', background:c.name===value?'#f3e8ff':'transparent',
                  color:'#1e293b', textAlign:'left' }}>
                <span style={{ fontSize:15 }}>{c.flag}</span>
                <span style={{ flex:1, fontWeight:c.name===value?700:400 }}>{c.name}</span>
                <span style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{c.dialCode}</span>
                {c.name===value && <Check size={11} style={{ color:'#7c3aed' }}/>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── How It Works Panel ───────────────────────────────────────────────
function HowItWorksPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, overflow:'hidden' }}>
      <button type="button" onClick={() => setOpen(v=>!v)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px',
          background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <Info size={14} style={{ color:'#b45309', flexShrink:0 }}/>
        <span style={{ fontSize:13, fontWeight:700, color:'#b45309', flex:1 }}>How to Configure — Click to expand</span>
        <ChevronDown size={13} style={{ color:'#b45309', transform:`rotate(${open?180:0}deg)`, transition:'transform 0.2s' }}/>
      </button>
      {open && (
        <div style={{ padding:'4px 16px 16px', fontSize:12, color:'#78350f', lineHeight:1.8 }}>

          <p style={{ margin:'0 0 6px', fontWeight:800, fontSize:13, color:'#92400e' }}>📋 Manual Mode</p>
          <p style={{ margin:'0 0 12px' }}>
            1. Add your <strong>OTP Receive URL</strong> + <strong>API Key</strong><br/>
            2. Paste phone numbers below<br/>
            3. Give the OTP Receive URL + API Key to your provider<br/>
            4. When OTP arrives → provider POSTs to your URL → OTP shows to users in real-time<br/>
            <code style={{ background:'#fef3c7', padding:'2px 6px', borderRadius:3, display:'block', margin:'4px 0', fontFamily:'monospace', fontSize:11 }}>
              POST {'{your-url}'} {`{ "number": "123456", "otp": "7890", "apiKey": "sk_xxx" }`}
            </code>
          </p>

          <p style={{ margin:'0 0 6px', fontWeight:800, fontSize:13, color:'#92400e' }}>⚡ Auto Mode (Advanced — e.g. 2oo9.cloud)</p>
          <p style={{ margin:'0 0 12px' }}>
            1. Add <strong>Number Fetch URL</strong> — e.g. <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3, fontSize:10 }}>https://api.2oo9.cloud/…/api/getnum</code><br/>
            2. Add <strong>OTP Check URL</strong> — e.g. <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3, fontSize:10 }}>https://api.2oo9.cloud/…/api/success-otp</code><br/>
            3. Add your <strong>Provider API Key</strong> (sent as <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3, fontSize:10 }}>mauthapi</code> header)<br/>
            4. Add ranges (e.g. <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>26134XXX</code> → system sends rid=<code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>26134</code>)<br/>
            5. System auto-fetches numbers via POST <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3, fontSize:10 }}>{`{ "rid": "26134" }`}</code><br/>
            6. System polls <strong>OTP Check URL</strong> every 5s until OTP arrives (up to 20 mins)<br/>
            <code style={{ background:'#fef3c7', padding:'2px 6px', borderRadius:3, display:'block', margin:'4px 0', fontFamily:'monospace', fontSize:11 }}>
              Response: {`{ "meta":{code:200}, "data":{ "full_number":"+44...", ... } }`}
            </code>
          </p>

          <p style={{ margin:'0', fontWeight:700, color:'#92400e' }}>
            💡 OTP Flow: User requests number → system gets number from provider → SMS arrives →
            provider sends OTP to your server → OTP delivered to user in real-time via socket
          </p>
        </div>
      )}
    </div>
  )
}

// ── Base URLs Section ────────────────────────────────────────────────
function BaseUrlsSection({
  baseUrls, onChange, mode
}: {
  baseUrls: BaseUrl[]; onChange: (v: BaseUrl[]) => void; mode: 'manual' | 'auto'
}) {
  const [showKey, setShowKey] = useState<number | null>(null)

  const OTP_RECEIVE_ENDPOINT = `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/otps/receive`

  const emptyManual: BaseUrl = {
    label: 'Default', numberFetchUrl: '', liveCheckUrl: '',
    otpReceiveUrl: OTP_RECEIVE_ENDPOINT, apiKey: '', active: true, extraUrls: []
  }
  const emptyAuto: BaseUrl = {
    label: '', numberFetchUrl: '', liveCheckUrl: '',
    otpReceiveUrl: OTP_RECEIVE_ENDPOINT, apiKey: '', active: true, extraUrls: []
  }

  const update = (i: number, field: keyof BaseUrl, val: any) =>
    onChange(baseUrls.map((u, idx) => idx === i ? { ...u, [field]: val } : u))

  const updateExtra = (i: number, ei: number, field: 'label' | 'url', val: string) =>
    onChange(baseUrls.map((u, idx) => idx === i ? {
      ...u, extraUrls: u.extraUrls.map((e, eidx) => eidx === ei ? { ...e, [field]: val } : e)
    } : u))

  const addExtra = (i: number) =>
    onChange(baseUrls.map((u, idx) => idx === i ? { ...u, extraUrls: [...(u.extraUrls||[]), { label: '', url: '' }] } : u))

  const removeExtra = (i: number, ei: number) =>
    onChange(baseUrls.map((u, idx) => idx === i ? { ...u, extraUrls: u.extraUrls.filter((_,eidx) => eidx !== ei) } : u))

  const remove = (i: number) => onChange(baseUrls.filter((_, idx) => idx !== i))

  const urlInp: React.CSSProperties = { ...inp, fontSize:12, borderColor:'#e2e8f0', background:'#fff' }

  // ── MANUAL MODE: OTP Receive URL + API Key only ──
  if (mode === 'manual') {
    if (baseUrls.length === 0) {
      setTimeout(() => onChange([{
        label:'Default', numberFetchUrl:'', liveCheckUrl:'',
        otpReceiveUrl:'', apiKey:'', active:true, extraUrls:[]
      }]), 0)
      return null
    }
    const u = baseUrls[0]
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <Link size={13} style={{ color:'#7c3aed' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Provider Connection — Manual Mode
          </span>
        </div>
        <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px', border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:10 }}>
          {/* OTP Receive URL — provider sends OTPs here */}
          <div>
            <label style={{ ...lbl, marginBottom:4, color:'#22c55e' }}>📥 OTP RECEIVE URL (provider sends OTPs here)</label>
            <input value={u.otpReceiveUrl} onChange={e => update(0,'otpReceiveUrl',e.target.value)}
              placeholder="https://your-server.com/api/otps/receive"
              style={{ ...urlInp, borderColor:'#bbf7d0' }}/>
            <p style={{ fontSize:10, color:'#64748b', margin:'4px 0 0' }}>
              Your provider will POST OTPs to this URL when SMS arrives on your numbers.
              <br/>Payload: <code style={{ background:'#f0fdf4', padding:'1px 4px', borderRadius:3, fontSize:10 }}>{`{ "number", "otp", "apiKey" }`}</code>
            </p>
          </div>
          {/* API Key */}
          <div style={{ position:'relative' }}>
            <label style={{ ...lbl, marginBottom:4, color:'#7c3aed' }}>🔑 PROVIDER API KEY</label>
            <div style={{ position:'relative' }}>
              <input type={showKey===0 ? 'text' : 'password'} value={u.apiKey} onChange={e => update(0,'apiKey',e.target.value)}
                placeholder="Your provider API key (shared secret)"
                style={{ ...urlInp, paddingRight:40 }}/>
              <button type="button" onClick={() => setShowKey(showKey===0 ? null : 0)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', padding:0 }}>
                {showKey===0 ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <p style={{ fontSize:10, color:'#64748b', margin:'4px 0 0' }}>
              Sent as <code style={{ background:'#f5f3ff', padding:'1px 4px', borderRadius:3, fontSize:10 }}>apiKey</code> in the OTP receive payload. Use this to verify the request is from your provider.
            </p>
          </div>
        </div>
        <div style={{ marginTop:10, background:'#fffbeb', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#92400e', lineHeight:1.6, border:'1px solid #fde68a' }}>
          <strong>Manual Flow:</strong> You paste numbers below → give your OTP Receive URL + API Key to your provider → provider calls this URL when OTP arrives → OTP shows to your users in real-time.
        </div>
      </div>
    )
  }

  // ── AUTO MODE: Number Fetch URL + OTP Check URL + API Key + Ranges ──
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Link size={13} style={{ color:'#7c3aed' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Provider Connection — Auto Mode
          </span>
        </div>
        <button type="button" onClick={() => onChange([...baseUrls, { ...emptyAuto }])}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7,
            fontSize:12, fontWeight:700, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer' }}>
          <Plus size={11}/> Add Provider
        </button>
      </div>

      {baseUrls.length === 0 && (
        <div style={{ textAlign:'center', padding:'16px', color:'#94a3b8', background:'#f8fafc',
          borderRadius:9, border:'1px dashed #e2e8f0', fontSize:12 }}>
          No provider URLs — click "+ Add Provider URL" to connect an SMS provider
        </div>
      )}

      {baseUrls.map((u, i) => (
        <div key={i} style={{ background:'#f8fafc', borderRadius:12, padding:'14px', border:'1px solid #e2e8f0', marginBottom:10 }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'#ede9fe',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#7c3aed', flexShrink:0 }}>
              {i+1}
            </div>
            <input value={u.label} onChange={e => update(i,'label',e.target.value)}
              placeholder={`Provider ${i+1} name (e.g. "Main", "Backup")`}
              style={{ flex:1, padding:'7px 10px', fontSize:13, fontWeight:600, borderRadius:8,
                border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', outline:'none' }}/>
            <button type="button" onClick={() => update(i,'active',!u.active)}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8,
                fontSize:11, fontWeight:700, border:'none', cursor:'pointer', whiteSpace:'nowrap',
                background: u.active ? '#dcfce7' : '#fee2e2', color: u.active ? '#16a34a' : '#dc2626' }}>
              {u.active ? <><ToggleRight size={12}/> Active</> : <><ToggleLeft size={12}/> Off</>}
            </button>
            <button type="button" onClick={() => remove(i)}
              style={{ width:32, height:32, borderRadius:8, border:'1px solid #fee2e2', background:'#fff',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
              <Trash2 size={13}/>
            </button>
          </div>

          {/* 1. Number Fetch URL */}
          <div style={{ marginBottom:10 }}>
            <label style={{ ...lbl, marginBottom:4, color:'#0ea5e9' }}>1️⃣ NUMBER FETCH URL (getnumCopyAllocate)</label>
            <input value={u.numberFetchUrl} onChange={e => update(i,'numberFetchUrl',e.target.value)}
              placeholder="https://api.2oo9.cloud/.../api/getnum  or  https://provider.com/api/getNumber"
              style={{ ...urlInp, borderColor:'#bae6fd' }}/>
            <p style={{ fontSize:10, color:'#64748b', margin:'3px 0 0' }}>
              System POSTs: <code style={{ background:'#f0f9ff', padding:'1px 4px', borderRadius:3 }}>{`{ "rid": "26134" }`}</code> with <code style={{ background:'#f0f9ff', padding:'1px 4px', borderRadius:3 }}>mauthapi: &lt;apiKey&gt;</code> header.
              Response expected: <code style={{ background:'#f0f9ff', padding:'1px 4px', borderRadius:3 }}>{`{ meta:{code:200}, data:{full_number, national_number, ...} }`}</code>
            </p>
          </div>

          {/* 2. OTP Check URL */}
          <div style={{ marginBottom:10 }}>
            <label style={{ ...lbl, marginBottom:4, color:'#f59e0b' }}>2️⃣ OTP CHECK URL (provider's success-otp / live feed)</label>
            <input value={u.liveCheckUrl} onChange={e => update(i,'liveCheckUrl',e.target.value)}
              placeholder="https://api.2oo9.cloud/.../api/success-otp  or  https://provider.com/api/getSms"
              style={{ ...urlInp, borderColor:'#fde68a' }}/>
            <p style={{ fontSize:10, color:'#64748b', margin:'3px 0 0' }}>
              System GETs this URL every 5 seconds to check if OTP arrived. For 2oo9: use <code style={{ background:'#fef9c3', padding:'1px 4px', borderRadius:3 }}>/success-otp</code> endpoint.
              Response: <code style={{ background:'#fef9c3', padding:'1px 4px', borderRadius:3 }}>{`{ data:{ otps:[{number, message, time}] } }`}</code>
            </p>
          </div>

          {/* 3. OTP Receive URL (webhook — our server endpoint) */}
          <div style={{ marginBottom:10 }}>
            <label style={{ ...lbl, marginBottom:4, color:'#22c55e' }}>3️⃣ OTP RECEIVE URL (your server — for webhook push, optional)</label>
            <input value={u.otpReceiveUrl} onChange={e => update(i,'otpReceiveUrl',e.target.value)}
              placeholder="https://your-server.com/api/otps/receive"
              style={{ ...urlInp, borderColor:'#bbf7d0' }}/>
            <p style={{ fontSize:10, color:'#64748b', margin:'3px 0 0' }}>
              <strong>This is YOUR server's URL.</strong> Give this to the provider so they can push OTPs directly (webhook). Leave blank if provider doesn't support push — polling via field 2 will handle it.
            </p>
          </div>

          {/* 4. API Key */}
          <div style={{ position:'relative', marginBottom: (u.extraUrls||[]).length > 0 ? 10 : 0 }}>
            <label style={{ ...lbl, marginBottom:4, color:'#7c3aed' }}>🔑 PROVIDER API KEY</label>
            <div style={{ position:'relative' }}>
              <input type={showKey===i ? 'text' : 'password'} value={u.apiKey} onChange={e => update(i,'apiKey',e.target.value)}
                placeholder="sk_live_... or Bearer token"
                style={{ ...urlInp, paddingRight:40, borderColor:'#ddd6fe' }}/>
              <button type="button" onClick={() => setShowKey(showKey===i ? null : i)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', padding:0 }}>
                {showKey===i ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {/* Extra URLs */}
          {(u.extraUrls||[]).map((ex, ei) => (
            <div key={ei} style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
              <input value={ex.label} onChange={e => updateExtra(i,ei,'label',e.target.value)}
                placeholder="Label (e.g. Status)"
                style={{ width:100, padding:'7px 8px', fontSize:11, borderRadius:7, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', outline:'none' }}/>
              <input value={ex.url} onChange={e => updateExtra(i,ei,'url',e.target.value)}
                placeholder="https://provider.com/api/..."
                style={{ flex:1, padding:'7px 10px', fontSize:11, borderRadius:7, border:'1px solid #e2e8f0', background:'#fff', color:'#1e293b', outline:'none' }}/>
              <button type="button" onClick={() => removeExtra(i,ei)}
                style={{ width:28, height:28, borderRadius:7, border:'1px solid #fee2e2', background:'#fff',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
                <X size={11}/>
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addExtra(i)}
            style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, padding:'5px 10px',
              borderRadius:7, fontSize:11, fontWeight:600, border:'1px dashed #e2e8f0',
              background:'transparent', color:'#94a3b8', cursor:'pointer' }}>
            <Plus size={10}/> Add extra URL
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Ranges Section ───────────────────────────────────────────────────
function RangesSection({ ranges, autoEnabled, onRangesChange, onAutoChange }:{
  ranges: RangeSlot[]; autoEnabled: boolean
  onRangesChange: (v: RangeSlot[]) => void; onAutoChange: (v: boolean) => void
}) {
  const [newRange, setNewRange] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')

  const add = () => {
    const r = newRange.trim().toUpperCase()
    if (!r) return
    const lines = r.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean)
    const next = [...ranges]
    lines.forEach((range, idx) => {
      if (!next.find(x => x.range === range)) {
        next.push({ range, priority: next.length + idx, active: true, successCount: 0 })
      }
    })
    onRangesChange(next); setNewRange('')
  }

  const toggle = (i: number) => onRangesChange(ranges.map((r,idx) => idx===i ? {...r,active:!r.active} : r))
  const remove = (i: number) => onRangesChange(ranges.filter((_,idx) => idx!==i))
  const movePriority = (i: number, dir: -1|1) => {
    const j = i + dir
    if (j < 0 || j >= ranges.length) return
    const next = [...ranges]
    ;[next[i], next[j]] = [next[j], next[i]]
    onRangesChange(next.map((r,idx) => ({...r, priority:idx})))
  }

  const openEdit = (i: number) => {
    setEditingIdx(i)
    setEditPrice(ranges[i].pricePerOtp != null ? String(ranges[i].pricePerOtp) : '')
  }
  const saveEdit = () => {
    if (editingIdx === null) return
    const val = editPrice.trim() === '' ? null : parseFloat(editPrice)
    onRangesChange(ranges.map((r, idx) => idx === editingIdx ? { ...r, pricePerOtp: (val != null && !isNaN(val) && val > 0) ? val : null } : r))
    setEditingIdx(null); setEditPrice('')
  }

  return (
    <div>
      {/* Edit Price Modal */}
      {editingIdx !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:500,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setEditingIdx(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16,
            width:340, maxWidth:'95vw', padding:'22px 24px', boxShadow:'0 16px 48px rgba(0,0,0,0.2)' }}>
            <h4 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>
              Set Price — <code style={{ color:'#7c3aed', fontSize:13 }}>{ranges[editingIdx]?.range}</code>
            </h4>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 16px', lineHeight:1.5 }}>
              Set a custom OTP price for this range. Leave blank to use the global price from Settings.
            </p>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.06em', color:'#94a3b8', display:'block', marginBottom:6 }}>
              PRICE PER OTP ($)
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc',
              borderRadius:9, padding:'8px 12px', border:'1px solid #e2e8f0', marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:700, color:'#94a3b8' }}>$</span>
              <input
                type="number" step="0.001" min="0"
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                placeholder="e.g. 0.005 (leave blank = global)"
                autoFocus
                style={{ flex:1, border:'none', background:'transparent', fontSize:15,
                  fontWeight:700, color:'#0f172a', outline:'none' }}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
              />
              {editPrice && (
                <button type="button" onClick={() => setEditPrice('')}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0 }}>
                  <X size={13}/>
                </button>
              )}
            </div>
            {editPrice && !isNaN(parseFloat(editPrice)) && parseFloat(editPrice) > 0 && (
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:'8px 12px', marginBottom:14,
                fontSize:12, color:'#15803d', border:'1px solid #bbf7d0' }}>
                Users earn <strong>${(parseFloat(editPrice) * 0.85).toFixed(4)}</strong> per OTP
                · Agents earn <strong>${(parseFloat(editPrice) * 0.15).toFixed(4)}</strong> commission
                <span style={{ fontSize:10, color:'#64748b', marginLeft:4 }}>(assuming 15% commission)</span>
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={() => setEditingIdx(null)}
                style={{ flex:1, padding:'9px 0', borderRadius:9, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#64748b', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={saveEdit}
                style={{ flex:2, padding:'9px 0', borderRadius:9, border:'none',
                  background:'#7c3aed', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Save size={13}/> Save Price
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Hash size={13} style={{ color:'#f59e0b' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Ranges — {ranges.length} configured
          </span>
        </div>
        <button type="button" onClick={() => onAutoChange(!autoEnabled)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11,
            fontWeight:700, border:'none', cursor:'pointer',
            background: autoEnabled ? '#ede9fe' : '#f1f5f9', color: autoEnabled ? '#7c3aed' : '#64748b' }}>
          {autoEnabled ? <Zap size={11}/> : <ToggleLeft size={11}/>}
          Auto-Range: {autoEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      {autoEnabled && (
        <div style={{ background:'#ede9fe', borderRadius:9, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#6d28d9', lineHeight:1.6 }}>
          <Zap size={11} style={{ display:'inline', marginRight:4 }}/>
          <strong>Auto-Range ON</strong> — System automatically picks the range with the highest OTP success rate.
          Ranges below are used as the candidate pool. Add multiple ranges and let the system optimize.
        </div>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <textarea value={newRange} onChange={e => setNewRange(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
          placeholder={"Add ranges (one per line):\n22901952XXX\n22901957XXX\n88017XXXXXX"}
          rows={3}
          style={{ flex:1, padding:'8px 12px', fontSize:12, borderRadius:8, border:'1px solid #e2e8f0',
            background:'#f8fafc', color:'#1e293b', outline:'none', resize:'vertical', fontFamily:'monospace' }}/>
        <button type="button" onClick={add}
          style={{ padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:700,
            background:'#f59e0b', color:'#fff', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, alignSelf:'flex-end' }}>
          <Plus size={12}/> Add
        </button>
      </div>
      {ranges.length > 0 && (
        <div style={{ borderRadius:10, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          {ranges.map((r, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto auto',
              padding:'8px 12px', borderBottom:'1px solid #f8fafc', gap:8, alignItems:'center',
              background: r.active ? '#fff' : '#f8fafc', opacity: r.active ? 1 : 0.6 }}>
              {/* Priority arrows */}
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <button type="button" onClick={() => movePriority(i,-1)} disabled={i===0}
                  style={{ background:'none', border:'none', cursor:i===0?'not-allowed':'pointer', color:'#94a3b8', padding:0, lineHeight:1, fontSize:10 }}>▲</button>
                <button type="button" onClick={() => movePriority(i,1)} disabled={i===ranges.length-1}
                  style={{ background:'none', border:'none', cursor:i===ranges.length-1?'not-allowed':'pointer', color:'#94a3b8', padding:0, lineHeight:1, fontSize:10 }}>▼</button>
              </div>
              {/* Range code + price badge */}
              <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                <code style={{ fontSize:13, fontFamily:'monospace', fontWeight:700, color:'#7c3aed', whiteSpace:'nowrap' }}>{r.range}</code>
                {r.pricePerOtp != null && r.pricePerOtp > 0 ? (
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                    background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0', whiteSpace:'nowrap' }}>
                    ${r.pricePerOtp}
                  </span>
                ) : (
                  <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap' }}>global price</span>
                )}
                {r.successCount > 0 && (
                  <span style={{ fontSize:11, color:'#22c55e', fontWeight:700, display:'flex', alignItems:'center', gap:2 }}>
                    <Star size={9}/> {r.successCount}
                  </span>
                )}
              </div>
              {/* Edit price button */}
              <button type="button" onClick={() => openEdit(i)}
                style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700,
                  padding:'3px 9px', borderRadius:7, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#7c3aed', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                <Edit2 size={10}/> Edit $
              </button>
              {/* ON/OFF toggle */}
              <button type="button" onClick={() => toggle(i)}
                style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, border:'none', cursor:'pointer',
                  background: r.active ? '#dcfce7' : '#fee2e2', color: r.active ? '#16a34a' : '#dc2626', flexShrink:0 }}>
                {r.active ? 'ON' : 'OFF'}
              </button>
              {/* Delete */}
              <button type="button" onClick={() => remove(i)}
                style={{ width:24, height:24, borderRadius:6, border:'1px solid #fee2e2', background:'#fff',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', flexShrink:0 }}>
                <X size={10}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Provider Modal ───────────────────────────────────────────────────
function ProviderModal({ initial, onSave, onClose }: {
  initial?: Provider; onSave: (p: any) => void; onClose: () => void
}) {
  const [country,     setCountry]     = useState(initial?.country || 'Bangladesh')
  const [services,    setServices]    = useState<string[]>(initial?.services?.length ? initial.services : (initial?.service ? [initial.service] : []))
  const [newService,  setNewService]  = useState('')
  const [isCustomSvc, setIsCustomSvc] = useState(false)
  const [customSvc,   setCustomSvc]   = useState('')
  const [numberMode,  setNumberMode]  = useState<'manual'|'auto'>(initial?.numberInputMode || 'manual')
  const [baseUrls,    setBaseUrls]    = useState<BaseUrl[]>(initial?.baseUrls || (
    initial?.extBaseUrl ? [{ label:'Default', numberFetchUrl:initial.extBaseUrl, liveCheckUrl:'', otpReceiveUrl:'', apiKey:initial.extApiKey||'', active:true, extraUrls:[] }] : []
  ))
  const [ranges,      setRanges]      = useState<RangeSlot[]>(initial?.ranges || [])
  const [autoRange,   setAutoRange]   = useState(initial?.autoRangeEnabled || false)
  const [numbers,     setNumbers]     = useState<NumEntry[]>(initial?.numbers || [])
  const [numInput,    setNumInput]    = useState('')
  // Pre-fill manualRange from existing numbers' range if editing
  const [manualRange, setManualRange] = useState(() => {
    if (initial?.numbers?.length) {
      // Pick the most common range from existing numbers
      const rangeCount: Record<string, number> = {}
      initial.numbers.forEach((n: NumEntry) => {
        if (n.range) rangeCount[n.range] = (rangeCount[n.range] || 0) + 1
      })
      const topRange = Object.entries(rangeCount).sort((a, b) => b[1] - a[1])[0]
      return topRange ? topRange[0] : ''
    }
    return ''
  })
  const [saving,      setSaving]      = useState(false)
  const numRef = useRef<HTMLTextAreaElement>(null)

  const addService = () => {
    const svc = isCustomSvc ? customSvc.trim() : newService.trim()
    if (!svc || services.includes(svc)) return
    setServices(prev => [...prev, svc])
    setNewService(''); setCustomSvc(''); setIsCustomSvc(false)
  }
  const removeService = (idx: number) => setServices(prev => prev.filter((_, i) => i !== idx))

  const addNumbers = () => {
    const lines = numInput.split(/[\n,\s]+/).map(s=>s.trim()).filter(s=>s.length>=7)
    const range = manualRange.trim().toUpperCase() || ''
    setNumbers(p => [...p, ...lines.map(num => ({
      number: num,
      // Use the manually set range — do NOT auto-generate per-number range
      range:  range,
      used:   false,
    }))])
    setNumInput(''); numRef.current?.focus()
  }

  const handleSave = async () => {
    if (services.length === 0 || !country) return
    setSaving(true)

    const assignedRange = manualRange.trim().toUpperCase()

    // If manual mode has a range set, ensure it's in the ranges array
    let finalRanges = [...ranges]
    if (numberMode === 'manual' && assignedRange) {
      if (!finalRanges.find(x => x.range === assignedRange)) {
        finalRanges = [...finalRanges, { range: assignedRange, priority: finalRanges.length, active: true, successCount: 0 }]
      }
    }

    // Assign the manual range to ALL numbers (overwrite any auto-generated per-number range)
    const finalNumbers = numbers.map(n => ({
      number: n.number,
      range:  assignedRange || n.range || '',
      used:   n.used,
    }))

    const payload = {
      country, service: services[0], services,
      numbers: finalNumbers,
      baseUrls,
      extApiKey:  baseUrls[0]?.apiKey || '',
      extBaseUrl: baseUrls[0]?.numberFetchUrl || '',
      ranges: finalRanges, autoRangeEnabled: autoRange,
      numberInputMode: numberMode,
      active: initial?.active ?? true,
    }
    try {
      let result
      const existingId = initial ? pid(initial) : ''
      if (existingId) {
        result = await api.put(`/service-providers/${existingId}`, payload)
      } else {
        result = await api.post('/service-providers', payload)
      }
      onSave(result?.provider || result)
      onClose()
    } catch (e: any) {
      console.error('Save provider error:', e)
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20,
        width:640, maxWidth:'98vw', maxHeight:'92vh', overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h3 style={{ fontSize:17, fontWeight:800, color:'#0f172a', margin:0 }}>
            {initial ? 'Edit Provider' : 'New Service Provider'}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>
          {/* How it works */}
          <HowItWorksPanel/>

          {/* Country + Services */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>COUNTRY *</label>
              <AdminCountryPicker value={country} onChange={setCountry}/>
            </div>
            <div>
              <label style={lbl}>SERVICES * — {services.length} added</label>
              {/* Added services chips */}
              {services.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
                  {services.map((svc, i) => (
                    <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700,
                      padding:'4px 10px', borderRadius:20, background:'#ede9fe', color:'#7c3aed', border:'1px solid #ddd6fe' }}>
                      {svc}
                      <button type="button" onClick={() => removeService(i)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:0, display:'flex' }}>
                        <X size={11}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Add service input + button */}
              <div style={{ display:'flex', gap:6 }}>
                {!isCustomSvc ? (
                  <>
                    <div style={{ position:'relative', flex:1 }}>
                      <select value={newService}
                        onChange={e => { if (e.target.value==='Custom...') { setIsCustomSvc(true); setNewService('') } else setNewService(e.target.value) }}
                        style={{ ...inp, paddingRight:32, appearance:'none', cursor:'pointer' }}>
                        <option value="">Select service to add...</option>
                        {POPULAR_SERVICES.filter(s => !services.includes(s)).map(s=><option key={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                    <button type="button" onClick={addService} disabled={!newService}
                      style={{ padding:'9px 14px', borderRadius:8, fontSize:12, fontWeight:700,
                        background: newService ? '#7c3aed' : '#e2e8f0', color: newService ? '#fff' : '#94a3b8',
                        border:'none', cursor: newService ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                      <Plus size={12}/> Add
                    </button>
                  </>
                ) : (
                  <>
                    <input value={customSvc} onChange={e=>setCustomSvc(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addService() } }}
                      placeholder="Custom service name..." style={{ ...inp, flex:1 }}/>
                    <button type="button" onClick={addService} disabled={!customSvc.trim()}
                      style={{ padding:'9px 14px', borderRadius:8, fontSize:12, fontWeight:700,
                        background: customSvc.trim() ? '#7c3aed' : '#e2e8f0', color: customSvc.trim() ? '#fff' : '#94a3b8',
                        border:'none', cursor: customSvc.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:5 }}>
                      <Plus size={12}/> Add
                    </button>
                    <button type="button" onClick={()=>{ setIsCustomSvc(false); setCustomSvc('') }}
                      style={{ padding:'9px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', color:'#94a3b8' }}>
                      <X size={13}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Number Input Mode toggle */}
          <div style={{ display:'flex', gap:8, background:'#f1f5f9', borderRadius:12, padding:5 }}>
            {(['manual','auto'] as const).map(m => (
              <button key={m} type="button" onClick={() => setNumberMode(m)}
                style={{ flex:1, padding:'10px 0', borderRadius:9, fontSize:13, fontWeight:700,
                  border:'none', cursor:'pointer', transition:'all 0.15s',
                  background: numberMode===m ? '#7c3aed' : 'transparent',
                  color: numberMode===m ? '#fff' : '#64748b',
                  boxShadow: numberMode===m ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {m === 'manual' ? <List size={14}/> : <Zap size={14}/>}
                {m === 'manual' ? 'Manual (Paste Numbers)' : 'Auto (Fetch Numbers)'}
              </button>
            ))}
          </div>

          {/* ── MANUAL MODE: Base URL + Numbers ── */}
          {numberMode === 'manual' && (
            <>
              {/* Base URLs */}
              <BaseUrlsSection baseUrls={baseUrls} onChange={setBaseUrls} mode="manual"/>

              {/* Divider */}
              <div style={{ borderTop:'1px solid #f1f5f9' }}/>

              {/* Range input — numbers belong to a range */}
              <div>
                <label style={{ ...lbl, color:'#7c3aed' }}>
                  RANGE (prefix for these numbers)
                </label>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1,
                    background:'#f5f3ff', borderRadius:9, padding:'9px 13px', border:'1px solid #ddd6fe' }}>
                    <Hash size={14} style={{ color:'#7c3aed', flexShrink:0 }}/>
                    <input
                      type="text"
                      value={manualRange}
                      onChange={e => setManualRange(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const r = manualRange.trim().toUpperCase()
                          if (r && !ranges.find(x => x.range === r)) {
                            setRanges(prev => [...prev, { range: r, priority: prev.length, active: true, successCount: 0 }])
                          }
                        }
                      }}
                      placeholder="e.g. 22465XXXXXX or 880171XXXX"
                      style={{ flex:1, border:'none', background:'transparent', fontSize:14,
                        fontWeight:700, color:'#7c3aed', outline:'none', fontFamily:'monospace' }}
                    />
                    {manualRange.trim() && (
                      <button type="button" onClick={() => setManualRange('')}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex' }}>
                        <X size={13}/>
                      </button>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => {
                      const r = manualRange.trim().toUpperCase()
                      if (!r) return
                      if (!ranges.find(x => x.range === r)) {
                        setRanges(prev => [...prev, { range: r, priority: prev.length, active: true, successCount: 0 }])
                      }
                    }}
                    disabled={!manualRange.trim()}
                    style={{ padding:'9px 14px', borderRadius:9, fontSize:12, fontWeight:700,
                      background: manualRange.trim() ? '#7c3aed' : '#e2e8f0',
                      color: manualRange.trim() ? '#fff' : '#94a3b8',
                      border:'none', cursor: manualRange.trim() ? 'pointer' : 'not-allowed',
                      display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap', flexShrink:0 }}>
                    <Plus size={12}/> Add
                  </button>
                </div>
                <p style={{ fontSize:11, color:'#64748b', margin:'4px 0 0', lineHeight:1.5 }}>
                  Type a range prefix and click <strong>Add</strong> (or press Enter). All numbers will be assigned to this range.
                </p>

                {/* Configured ranges list — editable */}
                {ranges.length > 0 && (
                  <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                    {ranges.map((r, i) => (
                      <span key={i} style={{
                        display:'inline-flex', alignItems:'center', gap:6,
                        fontSize:12, fontFamily:'monospace', fontWeight:700,
                        padding:'4px 10px', borderRadius:20,
                        background: r.range === manualRange.trim().toUpperCase() ? '#dcfce7' : '#ede9fe',
                        color: r.range === manualRange.trim().toUpperCase() ? '#16a34a' : '#7c3aed',
                        border:`1px solid ${r.range === manualRange.trim().toUpperCase() ? '#86efac' : '#ddd6fe'}`,
                        cursor:'pointer',
                      }}
                        onClick={() => setManualRange(r.range)}
                        title="Click to select this range"
                      >
                        {r.range}
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setRanges(p => p.filter((_,idx) => idx !== i)) }}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                            color:'inherit', display:'flex', lineHeight:1, opacity:0.7 }}>
                          <X size={10}/>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Numbers */}
              <div>
                <label style={lbl}>PHONE NUMBERS — paste multiple lines (one per line)</label>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <textarea ref={numRef} value={numInput} onChange={e=>setNumInput(e.target.value)}
                    onKeyDown={e=>{ if (e.ctrlKey && e.key==='Enter') addNumbers() }}
                    placeholder={"Paste numbers here:\n8801711223344\n8801812345678\n2290195847312"}
                    rows={4}
                    style={{ flex:1, padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid #e2e8f0',
                      background:'#f8fafc', color:'#1e293b', outline:'none', resize:'vertical', fontFamily:'monospace', lineHeight:1.6 }}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, justifyContent:'flex-end' }}>
                    <button type="button" onClick={addNumbers}
                      style={{ padding:'9px 14px', borderRadius:8, fontSize:13, fontWeight:700,
                        background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer',
                        display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                      <Plus size={13}/> Add All
                    </button>
                    <span style={{ fontSize:10, color:'#94a3b8', textAlign:'center' }}>Ctrl+Enter</span>
                  </div>
                </div>
                {numbers.length > 0 ? (
                  <div style={{ borderRadius:10, border:'1px solid #e2e8f0', overflow:'visible', maxHeight:200, overflowY:'auto' }}>
                    {numbers.map((n, i) => (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto',
                        padding:'7px 12px', borderBottom:'1px solid #f8fafc', gap:10, alignItems:'center' }}>
                        <code style={{ fontSize:12, fontFamily:'monospace', fontWeight:600, color:'#1e293b' }}>{n.number}</code>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                          background:n.used?'#fef9c3':'#dcfce7', color:n.used?'#b45309':'#16a34a' }}>
                          {n.used?'USED':'AVAIL'}
                        </span>
                        <button type="button" onClick={() => setNumbers(p=>p.filter((_,idx)=>idx!==i))}
                          style={{ width:22, height:22, borderRadius:5, border:'1px solid #fee2e2', background:'#fff',
                            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
                          <Trash2 size={10}/>
                        </button>
                      </div>
                    ))}
                    <div style={{ padding:'7px 12px', background:'#f8fafc', fontSize:11, color:'#94a3b8',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>{numbers.length} total · {numbers.filter(n=>!n.used).length} available</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'14px', color:'#94a3b8', background:'#f8fafc', borderRadius:9, border:'1px dashed #e2e8f0', fontSize:12 }}>
                    No numbers added yet — paste numbers above
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── AUTO MODE: Ranges + Base URLs ── */}
          {numberMode === 'auto' && (
            <>
              {/* Ranges first */}
              <RangesSection
                ranges={ranges}
                autoEnabled={autoRange}
                onRangesChange={setRanges}
                onAutoChange={setAutoRange}
              />

              {/* Divider */}
              <div style={{ borderTop:'1px solid #f1f5f9' }}/>

              {/* Base URLs */}
              <BaseUrlsSection baseUrls={baseUrls} onChange={setBaseUrls} mode="auto"/>
            </>
          )}

          {/* Footer */}
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'10px', borderRadius:10, fontSize:13, fontWeight:600,
                border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving || services.length === 0}
              style={{ flex:2, padding:'10px', borderRadius:10, fontSize:13, fontWeight:700, border:'none',
                background: saving || services.length === 0 ? '#e2e8f0' : '#7c3aed',
                color: saving || services.length === 0 ? '#94a3b8' : '#fff', cursor: saving || services.length === 0 ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {saving ? <><RefreshCw size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Saving...</>
                : <><Save size={13}/> {initial ? 'Save Changes' : 'Create Provider'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Test Provider Modal ──────────────────────────────────────────────
function TestProviderModal({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const [testing, setTesting]   = useState(false)
  const [results, setResults]   = useState<any[] | null>(null)
  const [allOk,   setAllOk]     = useState<boolean | null>(null)
  const [reqErr,  setReqErr]    = useState<string | null>(null)
  const [rangeInput, setRangeInput] = useState('')
  const [expandedBody, setExpandedBody] = useState<string | null>(null)

  const activeUrls = (provider.baseUrls || [])
  const firstRange = (provider.ranges || []).find(r => r.active)

  useEffect(() => {
    if (firstRange) setRangeInput(firstRange.range)
  }, [firstRange?.range])

  const runTest = async () => {
    setTesting(true); setResults(null); setReqErr(null); setAllOk(null); setExpandedBody(null)
    try {
      const res: any = await api.post(`/service-providers/${pid(provider)}/test-provider`, {
        range: rangeInput.trim() || undefined,
      })
      setResults(res.results || [])
      setAllOk(res.allOk ?? false)
    } catch (e: any) {
      setReqErr(e?.response?.data?.message || e?.message || 'Unknown error')
    } finally {
      setTesting(false)
    }
  }

  const levelColor = (lvl: string) => ({
    ok:    { bg:'#f0fdf4', border:'#86efac', text:'#15803d', icon:'✅' },
    warn:  { bg:'#fffbeb', border:'#fde68a', text:'#b45309', icon:'⚠️' },
    error: { bg:'#fef2f2', border:'#fecaca', text:'#dc2626', icon:'❌' },
    info:  { bg:'#eff6ff', border:'#bfdbfe', text:'#1d4ed8', icon:'ℹ️' },
  }[lvl] || { bg:'#f8fafc', border:'#e2e8f0', text:'#475569', icon:'•' })

  const typeColor = (type: string) => ({
    numberFetch: { bg:'#dbeafe', text:'#1d4ed8', label:'NUM FETCH' },
    otpCheck:    { bg:'#fef3c7', text:'#b45309', label:'OTP CHECK' },
    otpReceive:  { bg:'#dcfce7', text:'#15803d', label:'OTP RECEIVE' },
    extra:       { bg:'#f3e8ff', text:'#7c3aed', label:'EXTRA URL' },
  }[type] || { bg:'#f1f5f9', text:'#475569', label:'URL' })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20,
        width:640, maxWidth:'98vw', maxHeight:'94vh', overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)', display:'flex', flexDirection:'column' }}>

        {/* Sticky Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #f1f5f9',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
          position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#f0fdf4',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Terminal size={17} style={{ color:'#16a34a' }}/>
            </div>
            <div>
              <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0 }}>Test Provider</h3>
              <p style={{ fontSize:12, color:'#64748b', margin:0 }}>
                {(provider.services?.length ? provider.services : [provider.service]).filter(Boolean).join(', ')} · {provider.country}
                {' · '}<span style={{ fontWeight:700, color: activeUrls.length ? '#7c3aed' : '#dc2626' }}>
                  {activeUrls.length} active URL{activeUrls.length !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* No URLs at all warning */}
          {activeUrls.length === 0 && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12,
              padding:'14px 16px', fontSize:13, color:'#dc2626', display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={15}/>
              No Base URLs configured. Edit the provider and add at least one URL.
            </div>
          )}

          {/* URL overview cards */}
          {activeUrls.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8', margin:0 }}>
                WILL TEST {activeUrls.length} BASE URL{activeUrls.length > 1 ? 'S' : ''} · {activeUrls.reduce((s, u) => s + (u.numberFetchUrl ? 1 : 0) + (u.liveCheckUrl ? 1 : 0) + (u.otpReceiveUrl ? 1 : 0) + (u.extraUrls?.filter((e:any)=>e.url)?.length || 0), 0)} ENDPOINTS
              </p>
              {activeUrls.map((u, i) => (
                <div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px',
                  border: `1px solid ${u.active === false ? '#fde68a' : '#e2e8f0'}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:'#ede9fe',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#7c3aed', flexShrink:0 }}>
                      {i+1}
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0f172a', flex:1 }}>{u.label || `Provider ${i+1}`}</span>
                    {u.active === false && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, background:'#fef3c7', color:'#b45309' }}>
                        ⚠️ Inactive
                      </span>
                    )}
                    <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:20,
                      background: u.apiKey ? '#dcfce7' : '#fef2f2', color: u.apiKey ? '#16a34a' : '#dc2626' }}>
                      {u.apiKey ? '🔑 Key set' : '⚠️ No API Key'}
                    </span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5, paddingLeft:30 }}>
                    {u.numberFetchUrl && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                          background:'#dbeafe', color:'#1d4ed8', flexShrink:0, marginTop:1 }}>NUM FETCH</span>
                        <code style={{ fontSize:11, color:'#475569', wordBreak:'break-all', lineHeight:1.5 }}>{u.numberFetchUrl}</code>
                      </div>
                    )}
                    {u.liveCheckUrl && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                          background:'#fef3c7', color:'#b45309', flexShrink:0, marginTop:1 }}>OTP CHECK</span>
                        <code style={{ fontSize:11, color:'#475569', wordBreak:'break-all', lineHeight:1.5 }}>{u.liveCheckUrl}</code>
                      </div>
                    )}
                    {u.otpReceiveUrl && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                          background:'#dcfce7', color:'#15803d', flexShrink:0, marginTop:1 }}>OTP RECEIVE</span>
                        <code style={{ fontSize:11, color:'#475569', wordBreak:'break-all', lineHeight:1.5 }}>{u.otpReceiveUrl}</code>
                      </div>
                    )}
                    {(u.extraUrls || []).filter((e: any) => e.url).map((ex: any, ei: number) => (
                      <div key={ei} style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                          background:'#f3e8ff', color:'#7c3aed', flexShrink:0, marginTop:1 }}>{ex.label || 'EXTRA'}</span>
                        <code style={{ fontSize:11, color:'#475569', wordBreak:'break-all', lineHeight:1.5 }}>{ex.url}</code>
                      </div>
                    ))}
                    {!u.numberFetchUrl && !u.liveCheckUrl && !u.otpReceiveUrl && !(u.extraUrls||[]).some((e:any)=>e.url) && (
                      <span style={{ fontSize:11, color:'#94a3b8' }}>No URLs configured for this entry</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Range input + Run button */}
          {activeUrls.length > 0 && (
            <div>
              <label style={{ ...lbl, color:'#7c3aed' }}>TEST RANGE (optional — used for Number Fetch rid param)</label>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 22465XXXXXX  (blank = no rid param)"
                  style={{ ...inp, flex:1, fontFamily:'monospace', fontWeight:600 }}
                  onKeyDown={e => { if (e.key === 'Enter') runTest() }}
                />
                <button onClick={runTest} disabled={testing}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 22px', borderRadius:10,
                    fontSize:13, fontWeight:700, border:'none', cursor: testing ? 'not-allowed' : 'pointer',
                    background: testing ? '#e2e8f0' : '#16a34a', color: testing ? '#94a3b8' : '#fff',
                    flexShrink:0, whiteSpace:'nowrap' }}>
                  {testing
                    ? <><RefreshCw size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Testing...</>
                    : <><Play size={13}/> Run Test</>}
                </button>
              </div>
            </div>
          )}

          {/* Network-level error */}
          {reqErr && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12,
              padding:'14px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
              <AlertTriangle size={16} style={{ color:'#dc2626', flexShrink:0, marginTop:1 }}/>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#dc2626', margin:'0 0 3px' }}>Request Failed</p>
                <p style={{ fontSize:12, color:'#b91c1c', margin:0 }}>{reqErr}</p>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {results && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Summary banner */}
              <div style={{ background: allOk ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${allOk ? '#86efac' : '#fca5a5'}`,
                borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
                  background: allOk ? '#dcfce7' : '#fee2e2',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {allOk ? '✅' : '❌'}
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:800, color: allOk ? '#15803d' : '#dc2626', margin:0 }}>
                    {allOk ? 'All endpoints reachable' : 'Issues detected — see details below'}
                  </p>
                  <p style={{ fontSize:12, color: allOk ? '#16a34a' : '#dc2626', margin:0 }}>
                    {results.reduce((s, r) => s + r.checks.filter((c: any) => c.ok).length, 0)} passed &nbsp;·&nbsp;
                    {results.reduce((s, r) => s + r.checks.filter((c: any) => !c.ok && c.url).length, 0)} failed &nbsp;·&nbsp;
                    {results.reduce((s, r) => s + r.checks.filter((c: any) => !c.url).length, 0)} not configured
                  </p>
                </div>
              </div>

              {results.map((urlResult: any, ri: number) => (
                <div key={ri} style={{ border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'11px 16px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0',
                    display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:'#ede9fe',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#7c3aed', flexShrink:0 }}>
                      {ri+1}
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color:'#0f172a', flex:1 }}>{urlResult.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                      background: urlResult.apiKeySet ? '#dcfce7' : '#fef2f2',
                      color: urlResult.apiKeySet ? '#16a34a' : '#dc2626' }}>
                      {urlResult.apiKeySet ? '🔑 API Key set' : '⚠️ No API Key'}
                    </span>
                    {!urlResult.active && (
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#fef3c7', color:'#b45309' }}>
                        ⚠️ Inactive
                      </span>
                    )}
                    {urlResult.checks.every((c: any) => c.ok || !c.url)
                      ? <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#dcfce7', color:'#15803d' }}>✓ OK</span>
                      : <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#fef2f2', color:'#dc2626' }}>✗ Error</span>}
                  </div>

                  {urlResult.checks.map((check: any, ci: number) => {
                    const tc = typeColor(check.type)
                    const bodyKey = `${ri}-${ci}`
                    const isBodyOpen = expandedBody === bodyKey
                    return (
                      <div key={ci} style={{ padding:'14px 16px', borderBottom: ci < urlResult.checks.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6,
                            background: tc.bg, color: tc.text, flexShrink:0, marginTop:1 }}>{tc.label}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            {check.url
                              ? <code style={{ fontSize:11, color:'#475569', wordBreak:'break-all', lineHeight:1.5,
                                  display:'block', background:'#f8fafc', padding:'3px 8px', borderRadius:6, border:'1px solid #e2e8f0' }}>
                                  {check.method} {check.url}
                                </code>
                              : <span style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>Not configured</span>}
                          </div>
                          {check.url && (
                            <span style={{ fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:20, flexShrink:0,
                              background: check.ok ? '#dcfce7' : (check.error ? '#fef2f2' : '#fef3c7'),
                              color: check.ok ? '#15803d' : (check.error ? '#dc2626' : '#b45309') }}>
                              {check.status ? `HTTP ${check.status}` : check.error ? 'ERROR' : '—'}
                            </span>
                          )}
                        </div>

                        {check.diagnosis.length > 0 && (
                          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom: check.body ? 8 : 0 }}>
                            {check.diagnosis.map((d: any, di: number) => {
                              const lc = levelColor(d.level)
                              return (
                                <div key={di} style={{ display:'flex', alignItems:'flex-start', gap:7,
                                  background: lc.bg, border:`1px solid ${lc.border}`, borderRadius:8,
                                  padding:'7px 11px', fontSize:12, color: lc.text, lineHeight:1.5 }}>
                                  <span style={{ flexShrink:0 }}>{lc.icon}</span>
                                  <span>{d.msg}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {check.body && (
                          <div style={{ marginTop:8 }}>
                            <button onClick={() => setExpandedBody(isBodyOpen ? null : bodyKey)}
                              style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:7,
                                fontSize:11, fontWeight:700, border:'1px solid #e2e8f0', background:'#f8fafc',
                                color:'#475569', cursor:'pointer' }}>
                              <Terminal size={10}/>
                              {isBodyOpen ? 'Hide' : 'Show'} Response Body
                              <ChevronDown size={10} style={{ transform:`rotate(${isBodyOpen?180:0}deg)`, transition:'transform 0.15s' }}/>
                            </button>
                            {isBodyOpen && (
                              <div style={{ marginTop:6, background:'#0f172a', borderRadius:10, padding:'12px 14px',
                                border:'1px solid #1e293b', position:'relative' }}>
                                <div style={{ position:'absolute', top:8, right:10 }}>
                                  <CopyBtn text={JSON.stringify(check.body, null, 2)}/>
                                </div>
                                <pre style={{ margin:0, fontSize:11, color:'#a5f3fc', fontFamily:'monospace',
                                  whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.6,
                                  maxHeight:240, overflowY:'auto', paddingRight:60 }}>
                                  {JSON.stringify(check.body, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {check.error && !check.body && (
                          <div style={{ marginTop:4, background:'#fef2f2', border:'1px solid #fecaca',
                            borderRadius:8, padding:'7px 11px', fontSize:11, color:'#dc2626', fontFamily:'monospace' }}>
                            {check.error}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Idle state */}
          {!results && !reqErr && !testing && (
            <div style={{ textAlign:'center', padding:'24px', color:'#94a3b8', fontSize:13, lineHeight:1.8 }}>
              {activeUrls.length > 0
                ? <>Will test <strong>{activeUrls.reduce((s,u) => s + (u.numberFetchUrl?1:0) + (u.liveCheckUrl?1:0), 0)} endpoints</strong> across{' '}
                    <strong>{activeUrls.length} base URL{activeUrls.length > 1 ? 's' : ''}</strong>.<br/>
                    Set a range prefix (optional) then click <strong>Run Test</strong>.</>
                : 'Add an active Base URL first to enable testing.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function AdminServiceProvider() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProv,  setEditProv]  = useState<Provider|null>(null)
  const [expanded,  setExpanded]  = useState<string|null>(null)
  const [testProv,  setTestProv]  = useState<Provider|null>(null)

  const load = useCallback(() => {
    spApi.list()
      .then((resp: any) => setProviders(Array.isArray(resp) ? resp : (resp?.providers || [])))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const unsub = onDataUpdated((d: any) => { if (d.type==='serviceProviders') load() })
    return unsub
  }, [load])

  // Auto-cleanup garbage ranges on first load (once per session)
  useEffect(() => {
    const key = 'bittx_ranges_cleaned'
    if (sessionStorage.getItem(key)) return
    api.post('/service-providers/cleanup-ranges', {})
      .then((r: any) => {
        if (r?.cleaned > 0 || r?.message?.includes('Cleaned')) {
          console.log('Auto-cleanup:', r.message)
          load() // reload after cleanup
        }
        sessionStorage.setItem(key, '1')
      })
      .catch(() => sessionStorage.setItem(key, '1'))
  }, [load])

  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState('')

  const handleCleanRanges = async () => {
    setCleaning(true)
    try {
      const r: any = await api.post('/service-providers/cleanup-ranges', {})
      setCleanMsg(r?.message || 'Done')
      load()
      setTimeout(() => setCleanMsg(''), 4000)
    } catch (e: any) {
      setCleanMsg(e.message || 'Error')
      setTimeout(() => setCleanMsg(''), 3000)
    } finally {
      setCleaning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider?')) return
    await api.delete(`/service-providers/${id}`)
    setProviders(p => p.filter(x => pid(x) !== id))
    if (expanded === id) setExpanded(null)
  }

  const handleToggle = async (p: Provider) => {
    const id = pid(p)
    await api.put(`/service-providers/${id}`, { active: !p.active })
    setProviders(prev => prev.map(x => pid(x)===id ? {...x, active:!p.active} : x))
  }

  const totalStats = {
    providers: providers.length,
    active: providers.filter(p=>p.active).length,
    numbers: providers.reduce((s,p)=>s+(p.numbers||[]).length,0),
    available: providers.reduce((s,p)=>s+(p.numbers||[]).filter(n=>!n.used).length,0),
    ranges: providers.reduce((s,p)=>s+(p.ranges||[]).filter(r=>r.active).length,0),
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {(showModal || editProv) && (
        <ProviderModal
          initial={editProv ?? undefined}
          onSave={(result) => { load(); setEditProv(null); setShowModal(false) }}
          onClose={() => { setShowModal(false); setEditProv(null) }}
        />
      )}

      {testProv && (
        <TestProviderModal provider={testProv} onClose={() => setTestProv(null)}/>
      )}

      {/* Clean msg flash */}
      {cleanMsg && (
        <div style={{ padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600,
          background:'#f0fdf4', border:'1px solid #86efac', color:'#16a34a' }}>
          ✓ {cleanMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#0f172a', margin:0 }}>Service Provider</h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>
            Configure external OTP providers — Base URLs, Ranges, and Number management
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={handleCleanRanges} disabled={cleaning}
            title="Remove auto-generated per-number ranges (keeps only proper prefix ranges)"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', borderRadius:10,
              fontSize:12, fontWeight:600, background:'#fff', color:'#64748b',
              border:'1px solid #e2e8f0', cursor: cleaning ? 'not-allowed' : 'pointer',
              opacity: cleaning ? 0.7 : 1 }}>
            <RefreshCw size={13} style={{ animation: cleaning ? 'spin 0.8s linear infinite' : 'none' }}/>
            {cleaning ? 'Cleaning...' : 'Fix Ranges'}
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:10,
              fontSize:13, fontWeight:700, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer' }}>
            <Plus size={14}/> New Provider
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        {[
          { label:'Providers',  value:totalStats.providers, color:'#7c3aed', bg:'#f3e8ff' },
          { label:'Active',     value:totalStats.active,    color:'#22c55e', bg:'#dcfce7' },
          { label:'Numbers',    value:totalStats.numbers,   color:'#0ea5e9', bg:'#e0f2fe' },
          { label:'Available',  value:totalStats.available, color:'#16a34a', bg:'#dcfce7' },
          { label:'Ranges',     value:totalStats.ranges,    color:'#f59e0b', bg:'#fef3c7' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:`1px solid ${s.bg}` }}>
            <p style={{ fontSize:22, fontWeight:900, color:s.color, margin:0 }}>{s.value}</p>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8', margin:'4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Provider list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>Loading...</div>
      ) : providers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:16, border:'1px dashed #e2e8f0' }}>
          <p style={{ fontSize:16, color:'#94a3b8', margin:'0 0 16px' }}>No providers yet</p>
          <button onClick={() => setShowModal(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:10,
              fontSize:13, fontWeight:700, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer' }}>
            <Plus size={14}/> Add First Provider
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {providers.map(p => {
            const id = pid(p)
            const availNums = (p.numbers||[]).filter(n=>!n.used)
            const activeRanges = (p.ranges||[]).filter(r=>r.active)
            const isExpanded = expanded === id
            const country = COUNTRIES.find(c => c.name === p.country)

            return (
              <div key={id} style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                {/* Provider header row */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : id)}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#f3e8ff',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>
                    {country?.flag || '🌍'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                        {(p.services?.length ? p.services : [p.service]).filter(Boolean).map((svc, i) => (
                          <span key={i} style={{ fontSize:13, fontWeight:800, color:'#7c3aed', background:'#ede9fe',
                            padding:'2px 8px', borderRadius:6, border:'1px solid #ddd6fe' }}>{svc}</span>
                        ))}
                      </div>
                      <span style={{ fontSize:12, color:'#64748b' }}>·</span>
                      <span style={{ fontSize:13, color:'#475569' }}>{p.country}</span>
                      {p.numberInputMode === 'auto' && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:'#ede9fe', color:'#7c3aed' }}>⚡ AUTO</span>
                      )}
                      {p.autoRangeEnabled && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:'#fef3c7', color:'#b45309' }}><Zap size={9} style={{ display:'inline' }}/> AUTO-RANGE</span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'#94a3b8' }}>{availNums.length} available · {(p.numbers||[]).length} total</span>
                      <span style={{ fontSize:12, color:'#94a3b8' }}>{activeRanges.length} ranges · {(p.baseUrls||[]).length} URLs</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:20,
                      background: p.active ? '#dcfce7' : '#fee2e2', color: p.active ? '#16a34a' : '#dc2626' }}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); setTestProv(p as any) }}
                      title="Test provider connection"
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'0 10px', height:30, borderRadius:8,
                        border:'1px solid #bbf7d0', background:'#f0fdf4', cursor:'pointer', color:'#16a34a',
                        fontSize:12, fontWeight:700, flexShrink:0, whiteSpace:'nowrap' }}>
                      <Play size={11}/> Test
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditProv(p as any); setShowModal(true) }}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed' }}>
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleToggle(p) }}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
                      {p.active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(id) }}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid #fee2e2', background:'#fff', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
                      <Trash2 size={13}/>
                    </button>
                    <ChevronDown size={14} style={{ color:'#94a3b8', transform:`rotate(${isExpanded?180:0}deg)`, transition:'transform 0.2s' }}/>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop:'1px solid #f1f5f9', padding:'16px 18px', background:'#fafafa', display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Base URLs */}
                    {(p.baseUrls||[]).length > 0 && (
                      <div>
                        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8', margin:'0 0 8px' }}>BASE URLS</p>
                        {(p.baseUrls||[]).map((u,i) => (
                          <div key={i} style={{ background:'#fff', borderRadius:9, padding:'10px 12px', border:'1px solid #e2e8f0', marginBottom:6 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:'#475569' }}>{u.label || `URL ${i+1}`}</span>
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                                background: u.active?'#dcfce7':'#f1f5f9', color: u.active?'#16a34a':'#94a3b8' }}>
                                {u.active?'Active':'Off'}
                              </span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              {u.numberFetchUrl && <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap' }}>Fetch:</span>
                                <code style={{ fontSize:11, fontFamily:'monospace', color:'#0ea5e9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{u.numberFetchUrl}</code>
                                <CopyBtn text={u.numberFetchUrl}/>
                              </div>}
                              {u.otpReceiveUrl && <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap' }}>OTP:</span>
                                <code style={{ fontSize:11, fontFamily:'monospace', color:'#7c3aed', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{u.otpReceiveUrl}</code>
                                <CopyBtn text={u.otpReceiveUrl}/>
                              </div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ranges */}
                    {(p.ranges||[]).length > 0 && (
                      <div>
                        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8', margin:'0 0 8px' }}>RANGES</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {(p.ranges||[]).map((r,i) => (
                            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5,
                              fontSize:12, fontFamily:'monospace', fontWeight:700, padding:'4px 10px', borderRadius:20,
                              background: r.active?'#ede9fe':'#f1f5f9', color: r.active?'#7c3aed':'#94a3b8',
                              border: `1px solid ${r.active?'#ddd6fe':'#e2e8f0'}` }}>
                              {r.range}
                              {r.successCount > 0 && <span style={{ fontSize:10, color:'#22c55e' }}>★{r.successCount}</span>}
                              {!r.active && <span style={{ fontSize:10, color:'#94a3b8' }}>(off)</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available numbers sample */}
                    {availNums.length > 0 && (
                      <div>
                        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8', margin:'0 0 8px' }}>
                          AVAILABLE NUMBERS ({availNums.length})
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {availNums.slice(0,12).map((n,i) => (
                            <code key={i} onClick={() => navigator.clipboard.writeText(n.number)}
                              style={{ fontSize:11, fontFamily:'monospace', padding:'3px 9px', borderRadius:7,
                                background:'#f1f5f9', color:'#475569', cursor:'pointer', border:'1px solid #e2e8f0' }}>
                              {n.number}
                            </code>
                          ))}
                          {availNums.length > 12 && (
                            <span style={{ fontSize:11, color:'#94a3b8', padding:'3px 9px' }}>+{availNums.length-12} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
