# BITTX SMS — Full Stack Setup Guide

## Architecture
```
Frontend  → React + Vite (port 5173)
Backend   → Node.js + Express (port 5000)
Database  → MongoDB Atlas (cloud) or local MongoDB
Realtime  → Socket.IO (WebSocket)
```

---

## Step 1 — MongoDB Setup

### Option A: MongoDB Atlas (Recommended — Free)
1. Go to https://cloud.mongodb.com
2. Create free account → New Project → Build a Database → Free tier
3. Choose a cloud provider and region
4. Set username & password (save these!)
5. Network Access → Add IP Address → Allow from anywhere (0.0.0.0/0)
6. Connect → Compass or App → Copy connection string
7. Connection string looks like:
   `mongodb+srv://username:password@cluster0.abc.mongodb.net/bittxsms`

### Option B: Local MongoDB
- Install MongoDB Community: https://www.mongodb.com/try/download/community
- Connection string: `mongodb://localhost:27017/bittxsms`

---

## Step 2 — Backend Setup

```bash
# Open terminal in: BITTX SMS/server/
cd server

# Install dependencies
npm install

# Copy and edit .env
# Edit server/.env — set your MONGODB_URI
```

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster0.xxx.mongodb.net/bittxsms
JWT_SECRET=change_this_to_a_random_secret_string
CLIENT_URL=http://localhost:5173
OTP_USER_RATE=0.005
OTP_AGENT_COMMISSION=15
```

---

## Step 3 — Seed Initial Data

```bash
# In server/ directory:
npm run seed
```

This creates:
- Super Admin: admin@bittxsms.com / Admin@123456
- Demo Agent:  agent@bittxsms.com / Agent@123456
- Demo User:   islam@bittxsms.com / User@123456

---

## Step 4 — Frontend Setup

```bash
# In root BITTX SMS/ directory:
npm install
```

Edit `.env` (already created):
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Step 5 — Run Both Servers

### Terminal 1 — Backend:
```bash
cd server
npm run dev
```
Output: `✓ MongoDB connected` + `✓ Server running on http://localhost:5000`

### Terminal 2 — Frontend:
```bash
npm run dev
```
Output: `Local: http://localhost:5173`

---

## Step 6 — Access

| Panel        | URL                              | Login                          |
|--------------|----------------------------------|--------------------------------|
| User Panel   | http://localhost:5173            | islam@bittxsms.com             |
| Admin Panel  | http://localhost:5173/admin      | admin@bittxsms.com             |
| Agent Panel  | http://localhost:5173/agent      | agent@bittxsms.com             |
| API Health   | http://localhost:5000/api/health | —                              |

---

## How Data Flows

### OTP Flow:
```
User clicks "Get Number"
  → Frontend calls POST /api/otps/allocate (with API key)
  → Backend finds available number from ServiceProvider
  → Creates OTPLog (status: pending)
  → Auto-fail timer starts (20 min)
  → External SMS provider receives SMS → calls POST /api/otps/receive
  → Backend updates OTPLog (status: success, otp: "123456")
  → Credits user balance ($0.005 × (1-15%)) = $0.00425
  → Credits agent balance ($0.005 × 15%) = $0.00075
  → WebSocket emits to user: otp_received event
  → Frontend shows OTP instantly
```

### Admin ↔ Agent ↔ User sync:
```
All data stored in MongoDB
Admin adds user → stored in DB → Agent sees it immediately
Agent updates balance → stored in DB → User sees it on refresh
WebSocket handles real-time events (OTP, announcements, tickets)
```

---

## Production Deployment

### Frontend (Vercel):
```bash
npm run build
# Deploy dist/ to Vercel
# Set VITE_API_URL=https://your-backend.com/api
```

### Backend (Railway / Render):
```bash
# Deploy server/ folder
# Set environment variables in dashboard
# MONGODB_URI, JWT_SECRET, CLIENT_URL=https://your-frontend.com
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/auth/me | Current user |
| GET | /api/users | List users |
| PUT | /api/users/:id | Update user |
| GET | /api/otps | OTP history |
| POST | /api/otps/allocate | Allocate number (API key) |
| POST | /api/otps/receive | Receive OTP from provider |
| GET | /api/withdrawals | Withdrawal list |
| POST | /api/withdrawals | Request withdrawal |
| PUT | /api/withdrawals/:id | Approve/Reject |
| GET | /api/admin/stats | Dashboard stats |
| GET | /api/service-providers | Service providers |
| POST | /api/service-providers | Add provider |
