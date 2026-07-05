import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Copy, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { otpsApi } from '../lib/api'
import { onDataUpdated, onOTPReceived } from '../lib/socket'

const PAGE_SIZE = 25

function RangeBadge({ range }: { range: string }) {
  const [copied,  setCopied]  = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(range).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span
      onClick={handleCopy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="mask-num"
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
        padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
        background: copied ? '#dcfce7' : hovered ? '#ede9fe' : '#f5f3ff',
        color: copied ? '#16a34a' : '#7c3aed',
        border: `1px solid ${copied ? '#86efac' : '#ddd6fe'}`,
        userSelect: 'none', transition: 'all 0.15s',
      }}>
      {range}
      {/* Icon: copy or check */}
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        {copied
          ? <Check size={11} style={{ color: '#16a34a' }} />
          : hovered
            ? <Copy size={11} style={{ color: '#7c3aed', opacity: 0.7 }} />
            : null
        }
      </span>
      {/* Tooltip */}
      {hovered && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.92)', color: '#fff',
          fontSize: 11, fontWeight: 600, padding: '4px 10px',
          borderRadius: 6, whiteSpace: 'nowrap',
          fontFamily: 'system-ui, sans-serif', pointerEvents: 'none', zIndex: 50,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          {copied ? '✓ Copied!' : '📋 Click to copy range'}
          {/* Arrow */}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(15,23,42,0.92)',
          }} />
        </span>
      )}
    </span>
  )
}

interface SenderRow {
  senderId: string
  range: string
  count: number
  successCount: number
  lastSeen: string | null
  services: string[]
}

export default function SenderRange() {
  const { accentColor } = useTheme()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const [rows,   setRows]   = useState<SenderRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await otpsApi.senderRanges()
      const data: any[] = res?.rows || []
      setRows(data.map((r: any) => ({
        senderId:     r.senderId || 'UNKNOWN',
        range:        r.range    || 'N/A',
        count:        r.count    || 0,
        successCount: r.successCount || 0,
        lastSeen:     r.lastSeen || null,
        services:     (r.services || []).filter(Boolean),
      })))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    // Clean up any stale localStorage data from old version
    try { localStorage.removeItem('bittx_numbers') } catch {}
  }, [fetchData])

  useEffect(() => {
    const unsubData = onDataUpdated(() => fetchData())
    const unsubOTP  = onOTPReceived(() => fetchData())
    return () => { unsubData(); unsubOTP() }
  }, [fetchData])

  const filtered = rows.filter(r =>
    !search ||
    r.senderId.toLowerCase().includes(search.toLowerCase()) ||
    r.range.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Sender / Range</h1>
          <p className="page-sub">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {loading ? '…' : filtered.length.toLocaleString()}
            </span> unique sender–range pairs
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>• sorted by OTP count</span>
          </p>
        </div>
        <button onClick={fetchData} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}
          className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input type="text" placeholder="Search sender ID or range..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="form-input w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40"/>
      </div>

      {/* Table */}
      <div className="card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" style={{ overflow: 'visible' }}>
        <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
          <table className="data-table w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 uppercase tracking-wide">#</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 uppercase tracking-wide">Sender ID</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 uppercase tracking-wide">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Range
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#c4b5fd',
                      textTransform: 'none', letterSpacing: 0 }}>
                      📋 click to copy
                    </span>
                  </span>
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 uppercase tracking-wide">OTP Count</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 uppercase tracking-wide">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', fontSize: 13, color: '#94a3b8' }}>Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', fontSize: 14, color: '#94a3b8' }}>
                  {search ? 'No results for your search' : 'No data yet. Sender IDs and ranges will appear here once OTPs are received.'}
                </td></tr>
              ) : paginated.map((row, i) => (
                <tr key={`${row.senderId}__${row.range}`} className="border-b last:border-0 border-slate-50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-600 font-mono">{(page-1)*PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
                      {row.senderId}
                    </span>
                    {/* Show associated services as small tags */}
                    {row.services.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {row.services.slice(0, 3).map(s => (
                          <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10,
                            background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{s}</span>
                        ))}
                        {row.services.length > 3 && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10,
                            background: '#f1f5f9', color: '#94a3b8' }}>+{row.services.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><RangeBadge range={row.range}/></td>
                  <td className="px-4 py-2.5">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: row.count > 0 ? '#16a34a' : '#94a3b8' }}>
                        {row.count.toLocaleString()}
                      </span>
                      {row.successCount > 0 && (
                        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                          ✓ {row.successCount} success
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of{' '}
              <span className="font-semibold">{filtered.length.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page===1}
                className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <ChevronsLeft size={12}/>
              </button>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <ChevronLeft size={12}/>
              </button>
              <span className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <ChevronRight size={12}/>
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page===totalPages}
                className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <ChevronsRight size={12}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
