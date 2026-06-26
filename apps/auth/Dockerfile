# Build context = racine du monorepo (frontends/), voir docker-compose.yml
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune auth --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .

RUN npx turbo run build --filter=auth

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/auth/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/auth/.next/static ./apps/auth/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/auth/public ./apps/auth/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/auth/server.js"]
