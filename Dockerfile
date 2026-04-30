# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
COPY shared/package.json   ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json  ./backend/

RUN npm ci

# Copy all source
COPY shared/   ./shared/
COPY frontend/ ./frontend/
COPY backend/  ./backend/

# 1. Build shared types
RUN cd shared   && npx tsc

# 2. Build frontend → outputs to backend/public
RUN cd frontend && npx vite build

# 3. Build backend
RUN cd backend  && npx tsc

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps for the backend
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --omit=dev --ignore-scripts

# Copy compiled backend + built frontend (public/)
COPY --from=builder /app/backend/dist    ./backend/dist
COPY --from=builder /app/backend/public  ./backend/public

EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
