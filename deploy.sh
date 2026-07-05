#!/bin/bash
# ═══════════════════════════════════════════════════
#  BITTX SMS — One-Command Deployment Script
#  Run this on your VPS/Server after uploading files
# ═══════════════════════════════════════════════════

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      BITTX SMS Deployment          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"

# ── Check Docker ──
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo -e "${YELLOW}Installing Docker Compose...${NC}"
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# ── Check .env ──
if [ ! -f ".env" ]; then
  echo -e "${RED}ERROR: .env file not found!${NC}"
  echo -e "Create it from .env.production and fill in your values:"
  echo -e "  cp .env.production .env && nano .env"
  exit 1
fi

source .env
if [ "$MONGODB_URI" = "mongodb+srv://USERNAME:PASSWORD@cluster0.XXXXX.mongodb.net/bittxsms" ]; then
  echo -e "${RED}ERROR: Please update MONGODB_URI in .env with your real MongoDB connection!${NC}"
  exit 1
fi
if [ "$CLIENT_URL" = "https://YOUR_DOMAIN.com" ]; then
  echo -e "${RED}ERROR: Please update CLIENT_URL and VITE_API_URL in .env with your real domain!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Environment variables look good${NC}"

# ── Build & Start ──
echo -e "\n${YELLOW}Building Docker containers...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache

echo -e "\n${YELLOW}Starting services...${NC}"
docker compose up -d

# Wait for services
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 8

# ── Create Superadmin ──
echo -e "\n${YELLOW}Creating superadmin account...${NC}"
docker compose exec server node src/createAdmin.js || echo -e "${YELLOW}(admin may already exist)${NC}"

# ── Health Check ──
echo -e "\n${YELLOW}Running health check...${NC}"
sleep 3
if curl -sf http://localhost:5000/api/health > /dev/null; then
  echo -e "${GREEN}✓ Backend API is healthy${NC}"
else
  echo -e "${RED}⚠ Backend API health check failed — check logs: docker compose logs server${NC}"
fi

if curl -sf http://localhost > /dev/null; then
  echo -e "${GREEN}✓ Frontend is serving${NC}"
else
  echo -e "${RED}⚠ Frontend check failed — check logs: docker compose logs frontend${NC}"
fi

# ── Print Info ──
echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        BITTX SMS is now running!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${BLUE}🌐 Website:${NC}  ${CLIENT_URL}"
echo -e "${BLUE}🔧 API:${NC}      ${CLIENT_URL}/api/health"
echo -e ""
echo -e "${YELLOW}Default Login Credentials:${NC}"
echo -e "  Admin:  admin@bittxsms.com  /  Admin@123456"
echo -e "  Agent:  agent@bittxsms.com  /  Agent@123456"
echo -e "  User:   islam@bittxsms.com  /  User@123456"
echo -e ""
echo -e "${YELLOW}⚠ IMPORTANT: Change default passwords immediately after login!${NC}"
echo -e ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:     docker compose logs -f"
echo -e "  Restart:       docker compose restart"
echo -e "  Stop:          docker compose down"
echo -e "  Update:        git pull && bash deploy.sh"
