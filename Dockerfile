# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json   ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json  ./backend/
RUN npm ci

COPY shared/   ./shared/
COPY frontend/ ./frontend/
COPY backend/  ./backend/

# Build order: shared → frontend (into backend/public) → backend
RUN cd shared   && npx tsc
RUN cd frontend && npx vite build --outDir ../backend/public --emptyOutDir
RUN cd backend  && npx tsc -p tsconfig.build.json

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --omit=dev --ignore-scripts

COPY --from=builder /app/backend/dist    ./backend/dist
COPY --from=builder /app/backend/public  ./backend/public

EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
