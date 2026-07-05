import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Send, X, Paperclip, MessageSquare, RefreshCw } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { onNewTicket, onTicketReply, getSocket } from '../../lib/socket'

type TicketStatus = 'open' | 'replaced'

interface Message {
  _id?: string
  id?: string
  from: 'user' | 'admin' | 'agent'
  senderId?: string
  text: string
  time: string | Date
  image: string | null
}

interface Ticket {
  _id: string
  id?: string
  userId: string
  username: string
  subject: string
  status: TicketStatus
  createdAt: string
  messages: Message[]
}

const STATUS_CONFIG: Record<TicketStatus, { dot: string; badge: string; text: string; label: string }> = {
  open:     { dot: '#ef4444', badge: '#fee2e2', text: '#dc2626', label: 'Open' },
  replaced: { dot: '#3b82f6', badge: '#dbeafe', text: '#2563eb', label: 'Replaced' },
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTime(t: string | Date): string {
  if (!t) return ''
  const d = new Date(t)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const active = tickets.find(t => (t._id || t.id || '') === activeId) ?? tickets[0]

  const fetchTickets = useCallback(async () => {
    try {
      const data = await adminApi.tickets()
      const list = data.tickets || data || []
      setTickets(list)
      if (!activeId && list.length > 0) setActiveId(list[0]._id || list[0].id || '')
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [activeId])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // Socket: real-time new tickets
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsubNew = onNewTicket((data: any) => {
      const ticket = data.ticket || data
      setTickets(prev => {
        if (prev.some(t => t._id === ticket._id || t.id === ticket.id)) return prev
        return [ticket, ...prev]
      })
    })

    const unsubReply = onTicketReply((data: any) => {
      const { ticketId, msg } = data
      setTickets(prev => prev.map(t => {
        const tid = t._id || t.id
        if (tid === ticketId) {
          const msgs = [...(t.messages || []), msg]
          return { ...t, messages: msgs, status: 'replaced' }
        }
        return t
      }))
    })

    const onClosed = (data: any) => {
      setTickets(prev => prev.filter(t => (t._id || t.id) !== data.ticketId))
    }
    socket.on('ticket_closed', onClosed)

    return () => { unsubNew(); unsubReply(); socket.off('ticket_closed', onClosed) }
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, active?.messages.length])

  const filtered = tickets.filter(t => {
    const normalizedStatus = t.status === 'replaced' ? 'replaced' : t.status
    const matchFilter = filter === 'all' || normalizedStatus === filter
    const matchSearch = (t.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleSend = async () => {
    if (!replyText.trim() && !replyImage || !active) return
    setSending(true)
    try {
      const tid = active._id || active.id || ''
      const data = await adminApi.replyTicket(tid, replyText, replyImage || undefined)
      const updated = data.ticket
      setTickets(prev => prev.map(t => {
        const id = t._id || t.id
        if (id === tid) return updated
        return t
      }))
      setReplyText('')
      setReplyImage(null)
    } catch (err: any) {
      console.error('Reply failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    if (!active) return
    try {
      const tid = active._id || active.id || ''
      await adminApi.closeTicket(tid)
      setTickets(prev => prev.filter(t => (t._id || t.id) !== tid))
      setActiveId('')
    } catch (err: any) {
      console.error('Close failed:', err)
    }
  }

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setReplyImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Support Tickets</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {tickets.filter(t => t.status === 'open').length} open ·{' '}
            {tickets.filter(t => t.status === 'replaced').length} replaced
          </p>
        </div>
        <button onClick={fetchTickets}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff',
            color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Chat Layout */}
      <div style={{
        display: 'flex', height: 'calc(100vh - 200px)', minHeight: 500,
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {/* ── LEFT: Ticket List ── */}
        <div style={{
          width: 300, minWidth: 300, borderRight: '1px solid #f1f5f9',
          display: 'flex', flexDirection: 'column', background: '#fafafa',
        }}>
          {/* Search */}
          <div style={{ padding: '14px 12px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', fontSize: 13, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '6px 8px', gap: 4 }}>
            {(['all', 'open', 'replaced'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: filter === f ? '#7c3aed' : 'transparent',
                  color: filter === f ? '#fff' : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Ticket items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading tickets...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No tickets found
              </div>
            )}
              {filtered.map(ticket => {
              const tid = ticket._id || ticket.id || ''
              const s = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
              const isActive = tid === activeId
              return (
                <div
                  key={tid}
                  onClick={() => setActiveId(tid)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer', transition: 'background 0.15s',
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                    background: isActive ? '#f3e8ff20' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.username}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 13 }}>
                        {ticket.subject}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                      {timeSince(ticket.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Chat Area ── */}
        {active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Top bar */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{active.username}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                    background: (STATUS_CONFIG[active.status] || STATUS_CONFIG.open).badge,
                    color: (STATUS_CONFIG[active.status] || STATUS_CONFIG.open).text,
                  }}>
                    {(STATUS_CONFIG[active.status] || STATUS_CONFIG.open).label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{active.subject}</p>
              </div>
              <button
                onClick={handleClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer',
                }}
              >
                <X size={12} /> Close
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {active.messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: 13 }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  No messages
                </div>
              )}
              {active.messages.map((msg, i) => {
                const isFromAdmin = msg.from === 'admin'
                return (
                  <div
                    key={msg._id || msg.id || i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isFromAdmin ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ maxWidth: '70%' }}>
                      {/* Label */}
                      <span style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, display: 'block', paddingLeft: 4 }}>
                        {isFromAdmin ? 'You (Admin)' : `${active.username}${msg.from === 'agent' ? ' (Agent)' : ''}`} · {formatTime(msg.time)}
                      </span>
                      {/* Bubble */}
                      <div style={{
                        padding: '10px 14px', borderRadius: isFromAdmin ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        background: isFromAdmin ? '#7c3aed' : '#f1f5f9',
                        color: isFromAdmin ? '#fff' : '#1e293b',
                        fontSize: 14, lineHeight: 1.6,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}>
                        {msg.text && <p style={{ margin: 0 }}>{msg.text}</p>}
                        {msg.image && (
                          <img
                            src={msg.image} alt="attachment"
                            style={{ maxWidth: 200, borderRadius: 8, marginTop: msg.text ? 8 : 0, display: 'block' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{
              padding: '14px 16px', borderTop: '1px solid #f1f5f9',
              background: '#fff', flexShrink: 0,
            }}>
              {/* Image preview */}
              {replyImage && (
                <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                  <img src={replyImage} alt="preview" style={{ maxHeight: 80, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <button
                    onClick={() => setReplyImage(null)}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
                      background: '#ef4444', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 13, borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
                    outline: 'none', resize: 'none', boxSizing: 'border-box',
                  }}
                />
                {/* Attach image */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0,
                  }}
                >
                  <Paperclip size={16} />
                </button>
                <input
                  ref={fileInputRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleImageAttach}
                />
                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: 'none',
                    background: sending ? '#a78bfa' : '#7c3aed', color: '#fff', cursor: sending ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>Select a ticket to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
