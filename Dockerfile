# ─────────────────────────────────────────────────────────────
# BITTX SMS — Railway Full-Stack Dockerfile
# Stage 1: Build React frontend
# Stage 2: Run Express server + serve built frontend
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build React Frontend ────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL is injected at build time from Railway Build Variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Production Server ────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install backend dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source code
COPY server/src ./server/src

# Copy built React app into /app/public so Express can serve it
COPY --from=frontend-builder /app/dist ./public

# Railway injects PORT env variable dynamically — DO NOT hardcode
EXPOSE 8080

CMD ["node", "server/src/index.js"]
