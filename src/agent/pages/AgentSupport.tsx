import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, X, Paperclip, MessageSquare, RefreshCw, ChevronLeft, Plus } from 'lucide-react'
import { profileApi } from '../../lib/api'
import { onTicketReply, getSocket } from '../../lib/socket'

interface Message {
  _id?: string
  from: 'user' | 'admin' | 'agent'
  senderId?: string
  text: string
  time: string | Date
  image?: string | null
}

interface Ticket {
  _id: string
  subject: string
  status: 'open' | 'replaced'
  messages: Message[]
  createdAt: string
}

const STATUS_CONFIG: Record<string, { dot: string; badge: string; text: string; label: string }> = {
  open:     { dot: '#ef4444', badge: '#fee2e2', text: '#dc2626', label: 'Open' },
  replaced: { dot: '#3b82f6', badge: '#dbeafe', text: '#2563eb', label: 'Replaced' },
}

export default function AgentSupport() {
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const data = await profileApi.tickets()
      setTickets(data.tickets || data || [])
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // Socket: real-time admin replies
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsub = onTicketReply((data: any) => {
      const { ticketId, msg } = data
      setTickets(prev => prev.map(t => {
        if (t._id === ticketId) {
          return { ...t, messages: [...(t.messages || []), msg], status: 'replaced' }
        }
        return t
      }))
      setActiveTicket(prev => {
        if (prev && prev._id === ticketId) {
          return { ...prev, messages: [...(prev.messages || []), msg], status: 'replaced' }
        }
        return prev
      })
    })

    const onClosed = (data: any) => {
      setTickets(prev => prev.filter(t => t._id !== data.ticketId))
      setActiveTicket(prev => {
        if (prev && prev._id === data.ticketId) { setView('list'); return null }
        return prev
      })
    }
    socket.on('ticket_closed', onClosed)

    return () => { unsub(); socket.off('ticket_closed', onClosed) }
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTicket?.messages.length])

  const formatTime = (t: string | Date) => {
    if (!t) return ''
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return
    setSending(true)
    try {
      const data = await profileApi.createTicket(newSubject.trim(), newMessage.trim())
      const ticket = data.ticket
      setTickets(prev => [ticket, ...prev])
      setActiveTicket(ticket)
      setNewSubject('')
      setNewMessage('')
      setView('chat')
    } catch (err: any) {
      console.error('Create ticket failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    if ((!replyText.trim() && !replyImage) || !activeTicket) return
    setSending(true)
    try {
      const data = await profileApi.replyTicket(activeTicket._id, replyText, replyImage || undefined)
      setActiveTicket(data.ticket)
      setTickets(prev => prev.map(t => t._id === activeTicket._id ? data.ticket : t))
      setReplyText('')
      setReplyImage(null)
    } catch (err: any) {
      console.error('Reply failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setReplyImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Support</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Chat with admin support team
        </p>
      </div>

      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        height: 'calc(100vh - 220px)', minHeight: 480,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* ── List View ── */}
        {view === 'list' && (
          <>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={16} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Admin Support</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{tickets.length} ticket(s)</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={fetchTickets}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff',
                    color: '#475569', cursor: 'pointer' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
                <button onClick={() => setView('new')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, border: 'none', background: '#6366f1',
                    color: '#fff', cursor: 'pointer' }}>
                  <Plus size={12} /> New Ticket
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Loading tickets...
                </div>
              )}
              {!loading && tickets.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p>No tickets yet. Create one to get help!</p>
                </div>
              )}
              {tickets.map(ticket => {
                const s = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                return (
                  <div key={ticket._id} onClick={() => { setActiveTicket(ticket); setView('chat') }}
                    style={{ padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s' }}
                    className="hover:bg-slate-50">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                            {ticket.subject}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, paddingLeft: 16 }}>
                          {ticket.messages?.length || 0} messages · {timeSince(ticket.createdAt)}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: s.badge, color: s.text, flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── New Ticket View ── */}
        {view === 'new' && (
          <>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', flexShrink: 0 }}>
              <button onClick={() => setView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <ChevronLeft size={18} />
              </button>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>New Support Ticket</p>
            </div>
            <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>SUBJECT *</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. OTP not working, Balance issue"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
                    outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 5 }}>MESSAGE *</label>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={6}
                  style={{ flex: 1, width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
                    outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleCreateTicket} disabled={sending || !newSubject.trim() || !newMessage.trim()}
                style={{ padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: sending ? 'wait' : 'pointer',
                  background: (!newSubject.trim() || !newMessage.trim()) ? '#e2e8f0' : '#6366f1',
                  color: (!newSubject.trim() || !newMessage.trim()) ? '#94a3b8' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s' }}>
                <Send size={14} /> {sending ? 'Sending...' : 'Submit Ticket'}
              </button>
            </div>
          </>
        )}

        {/* ── Chat View ── */}
        {view === 'chat' && activeTicket && (
          <>
            {/* Top bar */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setView('list')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <ChevronLeft size={18} />
                </button>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={16} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{activeTicket.subject}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <p style={{ fontSize: 11, color: '#22c55e', margin: 0, fontWeight: 600 }}>Online</p>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: STATUS_CONFIG[activeTicket.status]?.badge || '#f1f5f9',
                color: STATUS_CONFIG[activeTicket.status]?.text || '#64748b' }}>
                {STATUS_CONFIG[activeTicket.status]?.label || activeTicket.status}
              </span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activeTicket.messages?.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>
                  No messages yet
                </div>
              )}
              {activeTicket.messages?.map((msg, i) => {
                const isAgent = msg.from === 'agent'
                const isUser = msg.from === 'user'
                const isFromMe = isAgent || isUser
                return (
                  <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column',
                    alignItems: isFromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {isAgent && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe',
                          color: '#7c3aed', padding: '2px 7px', borderRadius: 10 }}>AGENT</span>
                      )}
                      {isUser && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe',
                          color: '#2563eb', padding: '2px 7px', borderRadius: 10 }}>USER</span>
                      )}
                      {!isFromMe && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe',
                          color: '#2563eb', padding: '2px 7px', borderRadius: 10 }}>ADMIN</span>
                      )}
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatTime(msg.time)}</span>
                    </div>
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px',
                      borderRadius: isFromMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                      background: isFromMe ? '#6366f1' : '#f1f5f9',
                      color: isFromMe ? '#fff' : '#1e293b',
                      fontSize: 14, lineHeight: 1.6,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      {msg.text && <p style={{ margin: 0 }}>{msg.text}</p>}
                      {msg.image && (
                        <img src={msg.image} alt="attachment"
                          style={{ maxWidth: 200, borderRadius: 8, marginTop: msg.text ? 8 : 0, display: 'block' }} />
                      )}
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 4 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', display: 'inline-block',
                      animation: `bounce 1.2s infinite ${d}s` }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {replyImage && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <img src={replyImage} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>Image ready</span>
                <button onClick={() => setReplyImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Type a message... (Enter to send)"
                  rows={2}
                  style={{ flex: 1, padding: '10px 14px', fontSize: 13, borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
                    outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e0e7ff',
                    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#6366f1', flexShrink: 0 }}>
                  <Paperclip size={16} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageAttach} />
                <button onClick={handleSend} disabled={sending}
                  style={{ width: 40, height: 40, borderRadius: 10, border: 'none',
                    background: sending ? '#a78bfa' : '#6366f1',
                    color: '#fff', cursor: sending ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0);opacity:0.4}
          40%{transform:translateY(-6px);opacity:1}
        }
      `}</style>
    </div>
  )
}
