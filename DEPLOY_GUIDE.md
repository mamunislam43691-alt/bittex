# 🚀 BITTX SMS — Complete Deployment Guide
> You only need to: buy hosting + domain. Everything else is automated.

---

## Step 1 — Buy Hosting (VPS)

### Recommended VPS Providers (cheap & reliable):
| Provider | Price | Link |
|----------|-------|------|
| **Hetzner** | ~€4/mo (best value) | https://hetzner.com |
| **DigitalOcean** | $6/mo | https://digitalocean.com |
| **Vultr** | $6/mo | https://vultr.com |
| **Contabo** | ~€5/mo (most RAM) | https://contabo.com |

### VPS Requirements:
- **OS:** Ubuntu 22.04 LTS
- **RAM:** Minimum 1GB (2GB recommended)
- **Storage:** 20GB SSD
- **CPU:** 1 vCPU minimum

---

## Step 2 — Buy Domain

### Recommended Domain Registrars:
| Provider | Price | Link |
|----------|-------|------|
| **Namecheap** | ~$10/yr | https://namecheap.com |
| **Cloudflare** | ~$10/yr (best DNS) | https://cloudflare.com |
| **GoDaddy** | ~$12/yr | https://godaddy.com |

---

## Step 3 — MongoDB Atlas (Free Database)

1. Go to https://cloud.mongodb.com
2. Create free account
3. Create new project → Build a Database → **Free tier (M0)**
4. Choose AWS/Google Cloud, any region close to your server
5. Set username & password (remember these!)
6. Network Access → **Add IP Address → 0.0.0.0/0** (allow all)
7. Connect → **Drivers** → Copy connection string
8. It looks like: `mongodb+srv://myuser:mypass@cluster0.abc12.mongodb.net/`

---

## Step 4 — Point Domain to Server

In your domain registrar's DNS settings:
```
Type: A    Name: @      Value: YOUR_SERVER_IP    TTL: auto
Type: A    Name: www    Value: YOUR_SERVER_IP    TTL: auto
```
Wait 5–30 minutes for DNS to propagate.

---

## Step 5 — Upload Files to Server

### Option A: Using FileZilla (FTP/SFTP)
1. Download FileZilla: https://filezilla-project.org
2. Host: YOUR_SERVER_IP, Protocol: SFTP, Port: 22
3. Username: root, Password: (from VPS provider)
4. Upload the entire `BITTX SMS` folder to `/root/bittxsms/`

### Option B: Using Git (if you have GitHub)
```bash
# On your server via SSH:
git clone https://github.com/YOUR_USERNAME/bittxsms.git /root/bittxsms
```

### Connect to server via SSH:
- Windows: Use **PuTTY** or Windows Terminal
- Mac/Linux: `ssh root@YOUR_SERVER_IP`

---

## Step 6 — Configure Environment

On your server, navigate to the project folder:
```bash
cd /root/bittxsms
cp .env.production .env
nano .env
```

Edit these values:
```env
CLIENT_URL=https://yourdomain.com
MONGODB_URI=mongodb+srv://myuser:mypass@cluster0.abc12.mongodb.net/bittxsms
JWT_SECRET=any_random_long_string_here_change_this
VITE_API_URL=https://yourdomain.com/api
```

Save: `Ctrl+X` → `Y` → `Enter`

---

## Step 7 — Deploy (One Command!)

```bash
chmod +x deploy.sh
bash deploy.sh
```

That's it! The script will:
- ✅ Install Docker automatically
- ✅ Build frontend (React)
- ✅ Build backend (Node.js)
- ✅ Start MongoDB
- ✅ Create admin/agent/user accounts
- ✅ Start everything

---

## Step 8 — Enable HTTPS/SSL (Free)

After domain DNS has propagated:
```bash
chmod +x ssl-setup.sh
bash ssl-setup.sh
```

Enter your domain and email when prompted. Done — free SSL forever!

---

## Step 9 — Access Your Site

| Panel | URL |
|-------|-----|
| Main site | https://yourdomain.com |
| Admin Panel | https://yourdomain.com/admin |
| Agent Panel | https://yourdomain.com/agent |

**Default passwords (change immediately!):**
```
Admin:  admin@bittxsms.com  /  Admin@123456
Agent:  agent@bittxsms.com  /  Agent@123456
User:   islam@bittxsms.com  /  User@123456
```

---

## Useful Commands (on server)

```bash
# View all logs
docker compose logs -f

# View only backend logs
docker compose logs -f server

# Restart everything
docker compose restart

# Stop everything
docker compose down

# Update after code changes
git pull && bash deploy.sh

# Check status
docker compose ps

# Database backup
docker exec bittxsms-mongo-1 mongodump --out /backup
```

---

## Troubleshooting

### Site not loading?
```bash
docker compose ps          # Check all containers running
docker compose logs server # Check backend errors
curl http://localhost:5000/api/health  # Test API directly
```

### MongoDB connection failed?
- Check MONGODB_URI in .env
- Make sure MongoDB Atlas IP whitelist has 0.0.0.0/0
- Test: `curl "http://localhost:5000/api/health"`

### SSL not working?
- Make sure domain DNS points to your server IP
- Wait 30 minutes for DNS propagation
- Re-run: `bash ssl-setup.sh`

---

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| VPS (Hetzner CX11) | ~$4 |
| Domain | ~$1 |
| MongoDB Atlas (Free tier) | $0 |
| SSL Certificate (Let's Encrypt) | $0 |
| **Total** | **~$5/month** |
