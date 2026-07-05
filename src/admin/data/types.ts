/**
 * Shared type definitions for admin panel components.
 * These replace the old mock data — all actual data comes from the API.
 */

export type Role = 'superadmin' | 'admin' | 'moderator' | 'support' | 'agent' | 'user'

export interface LoginSession {
  id?: string
  ip: string
  device?: string
  browser?: string
  mac?: string
  loginAt?: string
  createdAt?: string
  current?: boolean
  ipBanned?: boolean
  macBanned?: boolean
}

export interface User {
  id?: string
  _id?: string
  username: string
  email: string
  phone?: string
  role: Role
  balance: number
  totalEarned?: number
  status: 'active' | 'inactive' | 'banned' | 'suspended' | 'pending'
  agentId?: string | null
  agentEmail?: string
  agentUsername?: string
  country?: string
  city?: string
  address?: string
  telegram?: string
  birthDate?: string
  timezone?: string
  bio?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
  joinedAt?: string
  lastLogin?: string
  otpCount?: number
  successRate?: number
  failedOtps?: number
  otpActive?: boolean
  lastOtpAt?: string
  apiEnabled?: boolean
  apiKey?: string
  commission?: number
  totalCommission?: number
  sessions?: LoginSession[]
  profileComplete?: boolean
  twoFALogin?: boolean
  twoFAPayments?: boolean
  savedAddresses?: any[]
}

export interface Agent extends User {
  commission: number
  totalCommission?: number
  balance: number
  role: Role
  totalEarned?: number
  apiEnabled?: boolean
  apiKey?: string
  telegram?: string
  bio?: string
  address?: string
  birthDate?: string
  timezone?: string
  photoUrl?: string
  usersCount?: number
}

export interface Announcement {
  id?: string
  _id?: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  active: boolean
  displayType?: 'popup' | 'banner'
  buttonText?: string
  buttonUrl?: string
  imageUrl?: string
  videoUrl?: string
  createdAt?: string
  updatedAt?: string
}
