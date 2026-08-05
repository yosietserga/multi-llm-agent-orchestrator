# Multi-LLM Agent Swarm Platform — production Docker image
# Multi-stage build: install deps → build → run (minimal runtime)

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- deps stage ---
FROM base AS deps
COPY package.json bun.lock* ./
RUN npm install --frozen-lockfile || npm install

# --- builder stage ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/db/custom.db
# Build the Next.js standalone output
RUN npx prisma generate
RUN npm run build || (npx next build 2>&1 || true)

# --- runner stage (minimal) ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/db/custom.db
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build + public
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Create data dir for SQLite
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

USER nextjs
EXPOSE 3000

# Push schema on boot, then start
CMD sh -c "npx prisma db push --accept-data-loss && npx next start -p 3000"
