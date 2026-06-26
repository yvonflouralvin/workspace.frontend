# Build context = racine du monorepo (frontends/), voir docker-compose.yml
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune workspace --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .

RUN npx turbo run build --filter=workspace

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/workspace/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/workspace/.next/static ./apps/workspace/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/workspace/public ./apps/workspace/public

USER nextjs
EXPOSE 3005
ENV PORT=3005
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/workspace/server.js"]
