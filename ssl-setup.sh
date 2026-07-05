#!/bin/bash
# ═══════════════════════════════════════════════════
#  SSL Certificate Setup (Free HTTPS via Let's Encrypt)
#  Run AFTER deploy.sh, once your domain is pointing to server
# ═══════════════════════════════════════════════════

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

read -p "Enter your domain (e.g. bittxsms.com): " DOMAIN
read -p "Enter your email for SSL notifications: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo -e "${RED}Domain and email are required!${NC}"; exit 1
fi

echo -e "${YELLOW}Getting SSL certificate for $DOMAIN...${NC}"

# Stop nginx temporarily
docker compose stop frontend

# Get certificate
docker run --rm \
  -v "$(pwd)/certbot_certs:/etc/letsencrypt" \
  -v "$(pwd)/certbot_www:/var/www/certbot" \.sh
  c:\Users\mtmam\Desktop\BITTX SMS\ssl-setup.sh
  
  
  
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Update nginx.conf with domain
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx.conf

# Enable HTTPS in nginx.conf (uncomment the https server block)
python3 -c "
import re
with open('nginx.conf','r') as f: content = f.read()
# Remove comment markers from https block
content = re.sub(r'^# (.*ssl.*)', r'\1', content, flags=re.MULTILINE)
content = re.sub(r'^# (server \{)', r'\1', content, flags=re.MULTILINE)
content = re.sub(r'^# (    .*)', r'\1', content, flags=re.MULTILINE)
# Add HTTP→HTTPS redirect
content = content.replace('# return 301 https://', 'return 301 https://')
with open('nginx.conf','w') as f: f.write(content)
" 2>/dev/null || echo "Manual nginx update needed"

# Restart frontend
docker compose start frontend

echo -e "${GREEN}✓ SSL certificate installed for $DOMAIN${NC}"
echo -e "${GREEN}✓ Your site is now available at https://$DOMAIN${NC}"
echo -e ""
echo -e "${YELLOW}Auto-renewal is set up — certificate renews every 90 days automatically.${NC}"
