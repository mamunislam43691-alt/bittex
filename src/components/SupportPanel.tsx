import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Paperclip, Image, MessageSquare, ChevronLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { profileApi } from '../lib/api'
import { onTicketReply, getSocket } from '../lib/socket'

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

interface SupportPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SupportPanel({ isOpen, onClose }: SupportPanelProps) {
  const { accentColor } = useTheme()
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const data = await profileApi.tickets()
      setTickets(data.tickets || data || [])
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    }
  }, [])

  // Fetch tickets on open
  useEffect(() => {
    if (isOpen) {
      fetchTickets()
      setView('list')
    }
  }, [isOpen, fetchTickets])

  // Socket: real-time admin replies
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsub = onTicketReply((data: any) => {
      const { ticketId, msg } = data
      setTickets(prev => prev.map(t => {
        if (t._id === ticketId) {
          const msgs = [...(t.messages || []), msg]
          return { ...t, messages: msgs, status: 'replaced' }
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
        if (prev && prev._id === data.ticketId) return null
        return prev
      })
      setView('list')
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

  // Create new ticket
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

  // Send reply
  const handleSend = async () => {
    if ((!inputValue.trim() && !previewImg) || !activeTicket) return
    setSending(true)
    try {
      const data = await profileApi.replyTicket(activeTicket._id, inputValue, previewImg || undefined)
      setActiveTicket(data.ticket)
      setTickets(prev => prev.map(t => t._id === activeTicket._id ? data.ticket : t))
      setInputValue('')
      setPreviewImg(null)
    } catch (err: any) {
      console.error('Reply failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreviewImg(ev.target?.result as string)
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openTicket = (ticket: Ticket) => {
    setActiveTicket(ticket)
    setView('chat')
  }

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    open: { bg: '#fee2e2', color: '#dc2626' },
    replaced: { bg: '#dbeafe', color: '#2563eb' },
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 96, right: 28,
        width: 360, height: 520,
        borderRadius: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        zIndex: 50,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${accentColor},${accentColor}cc)`,
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Support</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0 }}>We are online</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <X size={15} />
          </button>
        </div>

        {/* List view */}
        {view === 'list' && (
          <>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => setView('new')}
                style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1px dashed ${accentColor}`, background: `${accentColor}10`, color: accentColor,
                  cursor: 'pointer' }}>
                + New Ticket
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {tickets.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No tickets yet. Create one to get help!
                </div>
              )}
              {tickets.map(ticket => {
                const sb = STATUS_BADGE[ticket.status] || STATUS_BADGE.open
                return (
                  <div key={ticket._id} onClick={() => openTicket(ticket)}
                    style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      background: activeTicket?._id === ticket._id ? `${accentColor}08` : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ticket.subject}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                          {ticket.messages?.length || 0} messages · {timeSince(ticket.createdAt)}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: sb.bg, color: sb.color, flexShrink: 0 }}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* New ticket view */}
        {view === 'new' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>New Ticket</span>
            </div>
            <input
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              placeholder="Subject (e.g. Withdrawal issue)"
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-sidebar)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows={4}
              style={{ flex: 1, width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-sidebar)', color: 'var(--text-primary)',
                outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={handleCreateTicket} disabled={sending || !newSubject.trim() || !newMessage.trim()}
              style={{ marginTop: 10, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: sending ? 'wait' : 'pointer',
                background: (!newSubject.trim() || !newMessage.trim()) ? '#e2e8f0' : accentColor,
                color: (!newSubject.trim() || !newMessage.trim()) ? '#94a3b8' : '#fff',
                transition: 'all 0.15s' }}>
              {sending ? 'Sending...' : 'Submit Ticket'}
            </button>
          </div>
        )}

        {/* Chat view */}
        {view === 'chat' && activeTicket && (
          <>
            {/* Chat header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTicket.subject}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                  background: STATUS_BADGE[activeTicket.status]?.bg || '#f1f5f9',
                  color: STATUS_BADGE[activeTicket.status]?.color || '#64748b' }}>
                  {activeTicket.status}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: 14,
              background: 'var(--bg-sidebar)',
            }}>
              {activeTicket.messages?.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>
                  No messages yet
                </div>
              )}
              {activeTicket.messages?.map((msg, i) => {
                const isUser = msg.from === 'user'
                return (
                  <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
                      {isUser ? 'You' : 'Admin'} · {formatTime(msg.time)}
                    </span>
                    <div style={{
                      maxWidth: '82%', padding: '10px 14px',
                      borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                      background: isUser ? accentColor : 'var(--bg-card)',
                      color: isUser ? '#fff' : 'var(--text-primary)',
                      fontSize: 13, lineHeight: 1.55,
                      border: !isUser ? '1px solid var(--border)' : 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      {msg.text && <p style={{ margin: 0 }}>{msg.text}</p>}
                      {msg.image && <img src={msg.image} alt="" style={{ maxWidth: 180, borderRadius: 8, marginTop: msg.text ? 8 : 0, display: 'block' }} />}
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 4 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor, display: 'inline-block',
                      animation: `bounce 1.2s infinite ${d}s` }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {previewImg && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <img src={previewImg} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>Image ready to send</span>
                <button onClick={() => setPreviewImg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
              display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${accentColor}40`,
                    background: `${accentColor}12`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accentColor, flexShrink: 0 }}>
                  <Paperclip size={15} />
                </button>
                <input
                  type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Write your message..."
                  style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 9, padding: '9px 12px',
                    fontSize: 13, background: 'var(--bg-sidebar)', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={handleSend} disabled={!inputValue.trim() && !previewImg}
                  style={{ width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: (!inputValue.trim() && !previewImg) ? '#e2e8f0' : accentColor,
                    color: (!inputValue.trim() && !previewImg) ? '#94a3b8' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  <Send size={15} />
                </button>
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
    </>
  )
}
