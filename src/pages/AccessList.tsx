import { useState, useEffect } from 'react'
import { Globe, Hash, RefreshCw, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { spApi } from '../lib/api'
import { onDataUpdated } from '../lib/socket'
import { COUNTRIES } from '../lib/countries'

interface CountryRow {
  country: string
  ranges: string[]
  services: string[]
  totalSuccess: number
}

const flagMap = Object.fromEntries(COUNTRIES.map(c => [c.name, c.flag]))

export default function AccessList() {
  const { accentColor } = useTheme()
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await spApi.getCountriesServices()
      setCountries(res?.countries || [])
    } catch { setCountries([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => {
    const unsub = onDataUpdated((d) => { if (d.type === 'otps') fetchData() })
    return unsub
  }, [])

  const filtered = countries.filter(c =>
    !search || c.country.toLowerCase().includes(search.toLowerCase())
  )

  const allServices = [...new Set(countries.flatMap(c => c.services))].sort()

  return (
    <div className="page-wrap">
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Globe size={18} style={{ color: accentColor }} />
          <h1 className="page-title">Access List</h1>
        </div>
        <p className="page-sub">Countries and services with active number ranges.</p>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Countries', value: countries.length, bg: `${accentColor}12`, color: accentColor },
          { label: 'Services', value: allServices.length, bg: '#dcfce7', color: '#16a34a' },
          { label: 'Total Ranges', value: countries.reduce((s, c) => s + c.ranges.length, 0), bg: '#ede9fe', color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10, background: s.bg }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
          </div>
        ))}
        <button onClick={() => { fetchData(); }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
            borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input type="text" placeholder="Search countries..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
            fontSize: 13, borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Country grid */}
      {loading ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <RefreshCw size={20} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <Globe size={28} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 4px' }}>
            {search ? 'No countries match your search' : 'No countries with active ranges'}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            Ask your admin to configure service providers with ranges.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            const isExpanded = expandedCountry === c.country
            return (
              <div key={c.country}
                onClick={() => setExpandedCountry(isExpanded ? null : c.country)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  boxShadow: isExpanded ? `0 4px 16px ${accentColor}15` : 'none',
                  borderColor: isExpanded ? accentColor : 'var(--border)' }}>
                {/* Country header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                  <span style={{ fontSize: 24 }}>{flagMap[c.country] || '🌍'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.country}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: accentColor }}>
                        {c.ranges.length} range{c.ranges.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>·</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
                        {c.services.length} service{c.services.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                    {/* Services */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>Services</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.services.map(s => (
                          <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Ranges */}
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', display: 'block', marginBottom: 6 }}>Ranges</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.ranges.map(r => (
                          <span key={r} style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                            background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(r) }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
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
