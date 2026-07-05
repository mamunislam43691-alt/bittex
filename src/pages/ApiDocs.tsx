import { useState } from 'react'
import { Copy, Check, Play, ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const BASE_URL = 'https://api.bittxsms.com/v4'

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
      className="dark:border-slate-700">
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
        className="dark:bg-slate-800 dark:border-slate-700">
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: '#94a3b8', fontFamily: 'monospace' }}>{lang}</span>
        <button onClick={handleCopy}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
            color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
          className="hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          {copied
            ? <><Check size={12} style={{ color: '#16a34a' }} /> Copied</>
            : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      {/* Code */}
      <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, fontFamily: 'monospace',
        lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        background: '#f8fafc', color: '#334155' }}
        className="dark:bg-slate-900 dark:text-slate-300">
        {code}
      </pre>
    </div>
  )
}

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params: { name: string; type: string; required: boolean; desc: string }[]
  requestExample?: string
  responseExample: string
}

function EndpointCard({ method, path, description, params, requestExample, responseExample }: EndpointProps) {
  const [open, setOpen] = useState(false)
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${methodColors[method]}`}>{method}</span>
        <code className="text-sm font-mono text-slate-800 dark:text-slate-200 flex-1">{path}</code>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:block">{description}</span>
        {open ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>

          {params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Parameters</h4>
              <div className="space-y-2">
                {params.map(p => (
                  <div key={p.name} className="flex items-start gap-3 text-xs">
                    <code className="font-mono font-bold text-slate-700 dark:text-slate-300 w-28 flex-shrink-0">{p.name}</code>
                    <span className="text-slate-400 w-16 flex-shrink-0">{p.type}</span>
                    <span className={`flex-shrink-0 ${p.required ? 'text-red-500' : 'text-slate-400'}`}>{p.required ? 'required' : 'optional'}</span>
                    <span className="text-slate-500 dark:text-slate-400">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requestExample && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Request</h4>
              <CodeBlock code={requestExample} lang="json" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Response</h4>
            <CodeBlock code={responseExample} lang="json" />
          </div>
        </div>
      )}
    </div>
  )
}

const endpoints: EndpointProps[] = [
  {
    method: 'GET',
    path: '/api/getnum',
    description: 'Allocate a new virtual number from a specified range',
    params: [
      { name: 'token', type: 'string', required: true, desc: 'Your API public token' },
      { name: 'range', type: 'string', required: true, desc: 'Number range prefix (e.g. 2290195)' },
      { name: 'service', type: 'string', required: false, desc: 'Target service (whatsapp, telegram, etc.)' },
      { name: 'national', type: 'boolean', required: false, desc: 'Return in national format' },
    ],
    responseExample: JSON.stringify({
      status: "success",
      number: "+12290195847",
      range: "2290195",
      country: "US",
      operator: "AT&T",
      allocated_at: "2024-03-18T14:22:00Z"
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/api/liveaccess',
    description: 'Get live access status for your account',
    params: [
      { name: 'token', type: 'string', required: true, desc: 'Your API public token' },
    ],
    responseExample: JSON.stringify({
      status: "active",
      access_level: "high",
      numbers_available: 12450,
      rate_limit: {
        requests_per_minute: 60,
        remaining: 58
      }
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/api/success-otp',
    description: 'Retrieve successful OTP for a specific number',
    params: [
      { name: 'token', type: 'string', required: true, desc: 'Your API public token' },
      { name: 'number', type: 'string', required: true, desc: 'The allocated phone number' },
      { name: 'service', type: 'string', required: false, desc: 'Filter by service name' },
      { name: 'timeout', type: 'integer', required: false, desc: 'Wait seconds for OTP (max 120)' },
    ],
    responseExample: JSON.stringify({
      status: "success",
      number: "+12290195847",
      service: "WhatsApp",
      otp: "847291",
      message: "Your WhatsApp code is: 847291",
      received_at: "2024-03-18T14:22:45Z"
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/api/console',
    description: 'Get live OTP stream (last N entries)',
    params: [
      { name: 'token', type: 'string', required: true, desc: 'Your API public token' },
      { name: 'limit', type: 'integer', required: false, desc: 'Number of entries to return (max 100)' },
      { name: 'service', type: 'string', required: false, desc: 'Filter by service' },
      { name: 'country', type: 'string', required: false, desc: 'Filter by country code (e.g. US)' },
    ],
    responseExample: JSON.stringify({
      status: "success",
      count: 3,
      data: [
        {
          timestamp: "2024-03-18T14:22:45Z",
          type: "MOBILE",
          country: "US",
          service: "WhatsApp",
          range: "#2290195XXX",
          message: "Your WhatsApp code is: [REDACTED]"
        },
        {
          timestamp: "2024-03-18T14:22:30Z",
          type: "MOBILE",
          country: "RU",
          service: "Telegram",
          range: "#4475832XXX",
          message: "Telegram code: [REDACTED]"
        }
      ]
    }, null, 2),
  },
  {
    method: 'POST',
    path: '/api/getnum',
    description: 'Allocate number via POST with JSON body',
    params: [
      { name: 'token', type: 'string', required: true, desc: 'Your API public token' },
      { name: 'range', type: 'string', required: true, desc: 'Number range prefix' },
      { name: 'service', type: 'string', required: false, desc: 'Target service' },
      { name: 'count', type: 'integer', required: false, desc: 'Number of numbers to allocate (max 10)' },
    ],
    requestExample: JSON.stringify({
      token: "your_public_token_here",
      range: "2290195",
      service: "telegram",
      count: 1
    }, null, 2),
    responseExample: JSON.stringify({
      status: "success",
      allocated: 1,
      numbers: [
        {
          number: "+12290195847",
          range: "2290195",
          country: "US",
          operator: "AT&T"
        }
      ],
      allocated_at: "2024-03-18T14:22:00Z"
    }, null, 2),
  },
]

export default function ApiDocs() {
  const { accentColor } = useTheme()
  const [copiedBase, setCopiedBase] = useState(false)
  const [playToken, setPlayToken] = useState('')
  const [playRange, setPlayRange] = useState('2290195')
  const [playResponse, setPlayResponse] = useState<string | null>(null)
  const [playLoading, setPlayLoading] = useState(false)

  const handleCopyBase = () => {
    navigator.clipboard.writeText(BASE_URL)
    setCopiedBase(true)
    setTimeout(() => setCopiedBase(false), 2000)
  }

  const handlePlayground = async () => {
    if (!playToken.trim()) {
      setPlayResponse(JSON.stringify({ error: 'Please enter your API token', hint: 'Get your API key from the API Key Access page' }, null, 2))
      return
    }
    setPlayLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/getnum?token=${encodeURIComponent(playToken)}&range=${encodeURIComponent(playRange)}`)
      const data = await res.json()
      setPlayResponse(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setPlayResponse(JSON.stringify({ error: 'Request failed', message: err?.message || 'Could not connect to API server' }, null, 2))
    } finally {
      setPlayLoading(false)
    }
  }

  return (
    <div className="page-wrap">
      <div>
        <h1 className="page-title">API Documentation</h1>
        <p className="page-sub">
          Integrate BITTX SMS into your application. Support: <a href="https://t.me/bittxsmssupport" target="_blank" rel="noreferrer" className="text-accent hover:underline">@bittxsmssupport</a>
        </p>
      </div>

      {/* Base URL */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Base URL</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: '#f1f5f9', borderRadius: 10, padding: '10px 16px',
          border: '1px solid #e2e8f0' }}
          className="dark:bg-slate-800 dark:border-slate-700">
          <Terminal size={14} style={{ color: accentColor, flexShrink: 0 }} />
          <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
            color: '#334155' }} className="dark:text-slate-200">{BASE_URL}</code>
          <button
            onClick={handleCopyBase}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            className="hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {copiedBase ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
            {copiedBase ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Authentication */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="card-title mb-3">Authentication</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          All API requests require a <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-accent font-mono">token</code> parameter — your public API token from the Profile page.
        </p>
        <CodeBlock
          code={`// Query parameter
GET ${BASE_URL}/api/getnum?token=YOUR_TOKEN&range=2290195

// Or as JSON body (POST)
POST ${BASE_URL}/api/getnum
Content-Type: application/json

{"token": "YOUR_TOKEN", "range": "2290195"}`}
          lang="http"
        />
      </div>

      {/* Playground */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Play size={14} style={{ color: accentColor }} />
          <h2 className="card-title">Playground</h2>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full ml-auto">
            POST /api/getnum
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label block mb-1.5">API Token</label>
              <input
                type="text"
                value={playToken}
                onChange={e => setPlayToken(e.target.value)}
                placeholder="Paste your API token..."
                className="form-input w-full px-3 py-2 font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label className="form-label block mb-1.5">Range Prefix</label>
              <input
                type="text"
                value={playRange}
                onChange={e => setPlayRange(e.target.value)}
                placeholder="e.g. 2290195"
                className="form-input w-full px-3 py-2 font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
          <button
            onClick={handlePlayground}
            disabled={!playToken || playLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            <Play size={13} />
            {playLoading ? 'Sending...' : 'Send Request'}
          </button>
          {playResponse && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Response</p>
              <CodeBlock code={playResponse} lang="json" />
            </div>
          )}
        </div>
      </div>

      {/* Public API Section */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="card-title">Public API (token)</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All endpoints require your public API token</p>
        </div>
        <div className="p-4 space-y-3">
          {endpoints.map((ep, i) => (
            <EndpointCard key={i} {...ep} />
          ))}
        </div>
      </div>

      {/* Rate Limits */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="card-title mb-3">Rate Limits &amp; Errors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Rate Limits</p>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>• 60 requests/minute per token</p>
              <p>• 1000 requests/hour per token</p>
              <p>• 10 concurrent allocations max</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Error Codes</p>
            <div className="space-y-1.5 text-xs">
              <p><code className="text-red-500">401</code> <span className="text-slate-500 dark:text-slate-400">— Invalid or missing token</span></p>
              <p><code className="text-amber-500">429</code> <span className="text-slate-500 dark:text-slate-400">— Rate limit exceeded</span></p>
              <p><code className="text-red-500">404</code> <span className="text-slate-500 dark:text-slate-400">— Number not found</span></p>
              <p><code className="text-red-500">503</code> <span className="text-slate-500 dark:text-slate-400">— Service unavailable</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
