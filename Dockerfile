# Multi-stage Dockerfile for Cricket Auction Platform
# Stage 1: Build Frontend Client
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --workspace=client --ignore-scripts

COPY client ./client
RUN npm run build:client

# Stage 2: Build Backend Server
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --workspace=server --ignore-scripts

COPY server ./server
RUN npm run build:server

# Stage 3: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

# Prepare data mount directory
RUN mkdir -p /app/data && chown -R node:node /app

# Install production dependencies only
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --omit=dev --workspace=server --ignore-scripts && npm cache clean --force

# Copy compiled artifacts
COPY --chown=node:node --from=server-builder /app/server/dist ./server/dist
COPY --chown=node:node --from=client-builder /app/client/dist ./client/dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/readyz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

VOLUME ["/app/data"]

CMD ["node", "server/dist/index.js"]
