# ==========================================
# STAGE 1: Build and Run Tests
# ==========================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy dependency catalogs
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source files
COPY . .

# Run unit tests during build stage for automated verification
ENV NODE_ENV=test
RUN npm test

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:20-alpine AS runner

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies (no devDependencies, keep image lean)
RUN npm ci --only=production

# Copy server logic and public web assets from the builder stage
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/public ./public

# Expose server listener port
EXPOSE 3000

# Secure container execution: run as non-root user 'node'
USER node

# Health check configuration for Docker engines
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })" || exit 1

# Define application startup command
CMD ["node", "server.js"]
