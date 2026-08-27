FROM node:22-alpine AS base
RUN apk add --no-cache openssl

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Production crawlers use HTTP parsers. Avoid downloading a bundled browser
# that is not used by the web or scheduler containers.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client after the schema is present. The dependency stage
# only copies package manifests, so relying on npm install-time generation makes
# Prisma models degrade to `any` in a clean Docker build.
RUN mkdir -p public && npx prisma generate && npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

FROM deps AS scheduler
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY lib ./lib
COPY crawler ./crawler
COPY scripts ./scripts
COPY analyzer ./analyzer
COPY tsconfig.json ./tsconfig.json

RUN npx prisma generate

RUN addgroup --system --gid 1002 scheduler \
  && adduser --system --uid 1002 --ingroup scheduler scheduler

USER scheduler

CMD ["node", "analyzer/cron-scheduler.js"]
