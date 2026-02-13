FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Provide a dummy DATABASE_URL during build to prevent build-time errors
# The actual DATABASE_URL will be provided at runtime via environment variables
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy db directory - needed at runtime because db/schema.ts is imported
# by production code (services, repositories, etc.) for Drizzle ORM queries
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
# Note: drizzle.config.ts is NOT needed at runtime - it's only used for migrations
# and schema generation during development/build time

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
