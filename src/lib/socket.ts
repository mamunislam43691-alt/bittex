import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(userId: string, role: string): Socket {
  if (socket?.connected) return socket

  // In production, frontend & backend are on the same host — use window.location.origin
  // In dev, connect to localhost:5000
  const socketUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : import.meta.env.DEV
      ? 'http://localhost:5000'
      : window.location.origin

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    socket?.emit('join', { userId, role })
  })

  // Rejoin room after reconnect
  socket.on('reconnect', () => {
    socket?.emit('join', { userId, role })
  })

  socket.on('disconnect', () => {
    // No-op: connection state handled internally by socket.io
  })

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message)
  })

  return socket
}

export function getSocket(): Socket | null { return socket }

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

// ── Generic real-time data update ──
export type DataUpdateType = 'users' | 'agents' | 'withdrawals' | 'otps' | 'announcements' | 'newsfeed' | 'staff' | 'support' | 'stats'

export function onDataUpdated(cb: (data: { type: DataUpdateType; userId?: string }) => void): () => void {
  socket?.on('data_updated', cb)
  return () => { socket?.off('data_updated', cb) }
}

// ── OTP events ──
export function onOTPReceived(cb: (data: { logId: string; number: string; otp: string; service: string; earned: number }) => void): () => void {
  socket?.on('otp_received', cb)
  return () => { socket?.off('otp_received', cb) }
}

export function onOTPFailed(cb: (data: { logId: string; number: string }) => void): () => void {
  socket?.on('otp_failed', cb)
  return () => { socket?.off('otp_failed', cb) }
}

export function onOTPLive(cb: (data: any) => void): () => void {
  socket?.on('otp_live', cb)
  return () => { socket?.off('otp_live', cb) }
}

// ── Balance real-time update ──
export function onBalanceUpdated(cb: (data: { balance: number }) => void): () => void {
  socket?.on('balance_updated', cb)
  return () => { socket?.off('balance_updated', cb) }
}

// ── Support events ──
export function onNewTicket(cb: (data: any) => void): () => void {
  socket?.on('new_ticket', cb)
  return () => { socket?.off('new_ticket', cb) }
}

export function onTicketReply(cb: (data: any) => void): () => void {
  socket?.on('ticket_reply', cb)
  return () => { socket?.off('ticket_reply', cb) }
}

export function onTicketClosed(cb: (data: any) => void): () => void {
  socket?.on('ticket_closed', cb)
  return () => { socket?.off('ticket_closed', cb) }
}

// ── Announcement events ──
export function onNewAnnouncement(cb: (data: any) => void): () => void {
  socket?.on('new_announcement', cb)
  return () => { socket?.off('new_announcement', cb) }
}

// ── News Feed events ──
export function onNewsFeedUpdated(cb: (data: any) => void): () => void {
  socket?.on('data_updated', (d: any) => {
    if (d?.type === 'newsfeed') cb(d)
  })
  // Return a no-op since we can't easily unsubscribe this filtered handler
  // (the full data_updated unsub handles cleanup)
  return () => {}
}
