FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxt:nodejs /app/data/leetcode_details.json ./data/leetcode_details.json
COPY --from=builder --chown=nuxt:nodejs /app/data/study_lists.json ./data/study_lists.json
COPY --from=builder --chown=nuxt:nodejs /app/drizzle ./drizzle
COPY --from=prod-deps --chown=nuxt:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nuxt:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nuxt:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nuxt:nodejs /app/server/db ./server/db
COPY --from=builder --chown=nuxt:nodejs /app/shared ./shared
COPY --from=builder --chown=nuxt:nodejs /app/scripts ./scripts

USER nuxt
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health?check=ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
