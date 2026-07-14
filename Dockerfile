# Multi-stage build for API
FROM node:22-alpine AS api-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Generate Prisma client
RUN cd packages/api && npx prisma generate

# Build shared library first (API depends on compiled JS at runtime)
RUN npm run build -w packages/shared

# Build
RUN npm run build -w packages/api

# Production stage for API
FROM node:22-alpine AS api-production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built shared library (compiled JS — Node needs this, not the raw TS)
COPY --from=api-builder /app/packages/shared/dist ./packages/shared/dist

# Copy built files
COPY --from=api-builder /app/packages/api/dist ./packages/api/dist
COPY --from=api-builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=api-builder /app/node_modules/.prisma ./node_modules/.prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/api/dist/index.js"]

# Multi-stage build for Web
FROM node:22-alpine AS web-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source
COPY packages/web ./packages/web
COPY packages/shared ./packages/shared

# Build
RUN npm run build -w packages/shared && npm run build -w packages/web

# Production stage for Web (Nginx)
FROM nginx:alpine AS web-production

# Copy built files
COPY --from=web-builder /app/packages/web/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1
