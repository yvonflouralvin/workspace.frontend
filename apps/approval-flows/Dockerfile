# Build context = racine du monorepo (frontends/), voir docker-compose.yml
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune approval-flows --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .

ARG NEXT_PUBLIC_AUTH_API
ARG NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN
ARG NEXT_PUBLIC_AUTH_API_HR_DOMAIN
ARG NEXT_PUBLIC_WORKSPACE_DOMAIN
ARG NEXT_PUBLIC_NETWORK_ENCRYPTION
ARG NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY
ENV NEXT_PUBLIC_AUTH_API=$NEXT_PUBLIC_AUTH_API
ENV NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN=$NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN
ENV NEXT_PUBLIC_AUTH_API_HR_DOMAIN=$NEXT_PUBLIC_AUTH_API_HR_DOMAIN
ENV NEXT_PUBLIC_WORKSPACE_DOMAIN=$NEXT_PUBLIC_WORKSPACE_DOMAIN
ENV NEXT_PUBLIC_NETWORK_ENCRYPTION=$NEXT_PUBLIC_NETWORK_ENCRYPTION
ENV NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY=$NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY

RUN npx turbo run build --filter=approval-flows

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/approval-flows/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/approval-flows/.next/static ./apps/approval-flows/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/approval-flows/public ./apps/approval-flows/public

USER nextjs
EXPOSE 3006
ENV PORT=3006
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/approval-flows/server.js"]
