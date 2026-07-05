# 🚂 Railway.com Deployment Guide — BITTX SMS

Railway-তে সম্পূর্ণ deploy করতে মাত্র **৩টি ধাপ** লাগবে।

---

## ধাপ ১ — MongoDB Atlas সেটআপ (বিনামূল্যে)

1. যাও [cloud.mongodb.com](https://cloud.mongodb.com) → Free account খোলো
2. **New Project** → **Build a Database** → **Free (M0)** বেছে নাও
3. Username ও Password দাও (মনে রেখো!)
4. **Network Access** → **Add IP** → `0.0.0.0/0` দাও (সব IP allow)
5. **Connect** → **Drivers** → Connection string কপি করো:
   ```
   mongodb+srv://myuser:mypass@cluster0.abc12.mongodb.net/bittxsms?retryWrites=true&w=majority
   ```

---

## ধাপ ২ — GitHub-এ কোড তোলো

```bash
# Git initialize করো (যদি না থাকে)
git init
git add .
git commit -m "Initial commit"

# GitHub-এ নতুন repository খোলো, তারপর:
git remote add origin https://github.com/YOUR_USERNAME/bittx-sms.git
git push -u origin main
```

> **.gitignore** এ `.env` এবং `node_modules` আছে — secrets safe থাকবে।

---

## ধাপ ৩ — Railway-তে Deploy

### 3.1 — New Project তৈরি করো

1. [railway.com](https://railway.com) → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo**
3. তোমার `bittx-sms` repo বেছে নাও

### 3.2 — Dockerfile নির্দিষ্ট করো

Railway dashboard-এ Service-এর **Settings** ট্যাবে যাও:
- **Build** section → **Dockerfile Path**: `Dockerfile.railway`

### 3.3 — Environment Variables সেট করো

Service → **Variables** ট্যাবে এগুলো যোগ করো:

| Variable | মান |
|----------|-----|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | যেকোনো ৩২+ character random string |
| `NODE_ENV` | `production` |
| `OTP_USER_RATE` | `0.005` |
| `OTP_AGENT_COMMISSION` | `15` |
| `GMAIL_USER` | তোমার Gmail |
| `GMAIL_APP_PASSWORD` | Gmail App Password |
| `ADMIN_EMAIL` | admin email |
| `ADMIN_PASSWORD` | strong password |
| `ADMIN_USERNAME` | `superadmin` |

### 3.4 — Build Variable সেট করো

**Settings** → **Build** → **Build Variables**:

| Variable | মান |
|----------|-----|
| `VITE_API_URL` | `https://YOUR-APP.up.railway.app/api` |

> ⚠️ প্রথমে deploy করো, তারপর Railway যে URL দেয় সেটা দিয়ে `CLIENT_URL` এবং `VITE_API_URL` আপডেট করো, তারপর **redeploy** দাও।

### 3.5 — Deploy!

Railway automatically build ও deploy করবে। ২-৩ মিনিট অপেক্ষা করো।

---

## ✅ Deploy হয়ে গেলে

Railway তোমাকে একটা URL দেবে:
```
https://bittx-sms-production.up.railway.app
```

| Panel | URL |
|-------|-----|
| Main Site | `https://YOUR-APP.up.railway.app` |
| Admin Panel | `https://YOUR-APP.up.railway.app/admin` |
| Agent Panel | `https://YOUR-APP.up.railway.app/agent` |
| API Health | `https://YOUR-APP.up.railway.app/api/health` |

---

## Custom Domain যোগ করো (ঐচ্ছিক)

1. Railway → Service → **Settings** → **Domains** → **Add Custom Domain**
2. তোমার domain registrar-এ CNAME record যোগ করো:
   ```
   Type: CNAME   Name: @   Value: YOUR-APP.up.railway.app
   ```
3. Railway নিজেই SSL certificate দেবে (বিনামূল্যে!)

---

## সমস্যা হলে

### API কাজ করছে না?
```
https://YOUR-APP.up.railway.app/api/health
```
এই URL-এ গেলে `{"status":"ok"}` দেখালে সব ঠিক আছে।

### Build fail হচ্ছে?
- Railway → **Deployments** → failed deployment-এ ক্লিক → **Build Logs** দেখো

### MongoDB connect হচ্ছে না?
- `MONGODB_URI` variable ঠিকভাবে দেওয়া আছে কিনা চেক করো
- Atlas-এ Network Access-এ `0.0.0.0/0` আছে কিনা দেখো

### Variables পরিবর্তনের পর কাজ করছে না?
- Variables বদলালে Railway automatically redeploy করে, একটু অপেক্ষা করো

---

## Gmail App Password পাওয়ার উপায়

1. [myaccount.google.com](https://myaccount.google.com) → **Security**
2. **2-Step Verification** চালু করো
3. **App passwords** → App: `Mail`, Device: `Other` → নাম দাও `BITTX`
4. ১৬ character password পাবে — `GMAIL_APP_PASSWORD`-এ দাও

---

## খরচ

| সার্ভিস | খরচ |
|---------|-----|
| Railway (Hobby plan) | $5/মাস |
| MongoDB Atlas (Free M0) | $0 |
| SSL Certificate | $0 (Railway দেয়) |
| **মোট** | **$5/মাস** |

> Railway-র **Free tier** আছে কিন্তু সেটায় sleep হয়। Production-এর জন্য **Hobby ($5/মাস)** নাও।
