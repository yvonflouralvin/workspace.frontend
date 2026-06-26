# Build context = racine du monorepo (frontends/), voir docker-compose.yml
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune hr --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .

RUN npx turbo run build --filter=hr

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/hr/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/hr/.next/static ./apps/hr/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/hr/public ./apps/hr/public

USER nextjs
EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/hr/server.js"]
