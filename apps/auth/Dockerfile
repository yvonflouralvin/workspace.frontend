# Build context = racine du monorepo (frontends/), voir docker-compose.yml
#
# Pas de output:"standalone" (retiré partout du monorepo, cf. next.config.ts) : le
# runtime ci-dessous reproduit exactement `next build && next start` sur node_modules
# complets, comme en dev/prod — même comportement, juste pré-construit à l'image.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune auth --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
# --ignore-scripts : à ce stade, out/json ne contient que les package.json (pour
# le cache de couche) — le `prepare` de @repo/auth (tsc) n'a pas encore de source
# et échouerait. `turbo run build` ci-dessous le relance sur l'arbre complet.
RUN npm install --ignore-scripts
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=auth

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app .

USER nextjs
WORKDIR /app/apps/auth
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["npx", "next", "start", "--port", "3001"]
