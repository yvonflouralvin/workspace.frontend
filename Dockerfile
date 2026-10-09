# Image d'UNE application du monorepo. Le contexte de construction est la racine
# de `frontends/`, et l'application visée est passée en argument :
#
#   docker build -f Dockerfile --build-arg APP=auth .
#
# UN seul fichier pour les 19 applications, et non 19 copies : elles ne diffèrent
# que par ce nom. Les six Dockerfile par application qui existaient avant ont
# divergé — cinq copiaient encore `.next/standalone`, retiré du monorepo depuis,
# et auraient échoué à la construction. Une copie par application, c'est une
# occasion de divergence par application.
#
# Deux invariants vérifiés avant d'écrire ce fichier :
#   - le nom du paquet npm est identique au nom du dossier pour les 19 ;
#   - toutes servent sur le port 3000 à l'intérieur du conteneur.
#
# Pas de `output: "standalone"` : il a été retiré du monorepo (voir les
# next.config). Le runtime ci-dessous reproduit exactement `next build &&
# next start` sur des node_modules complets, comme en développement — même
# comportement, simplement pré-construit dans l'image.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat


# ── 1. Élaguer le monorepo à ce dont CETTE application a besoin ───────────────
FROM base AS pruner
ARG APP
WORKDIR /app
COPY . .
RUN test -n "$APP" || (echo "APP est requis : --build-arg APP=<nom>" >&2; exit 1)
RUN npx turbo prune "$APP" --docker


# ── 2. Construire ────────────────────────────────────────────────────────────
FROM base AS builder
ARG APP
WORKDIR /app

# D'abord les seuls package.json (out/json) : cette couche ne change que si une
# dépendance change, donc l'installation est mise en cache entre deux livraisons
# qui ne touchent que du code.
COPY --from=pruner /app/out/json/ .
# --ignore-scripts : à ce stade il n'y a QUE les package.json, et le `prepare`
# de certains paquets partagés compile du TypeScript — sans sources, il échoue.
# `turbo run build` ci-dessous les construit sur l'arbre complet.
RUN npm install --ignore-scripts

COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter="$APP"


# ── 3. Servir ────────────────────────────────────────────────────────────────
FROM base AS runner
ARG APP
# Repris en variable d'environnement : un ARG n'est pas visible depuis CMD.
ENV APP=$APP
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app .
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Forme JSON (les signaux d'arrêt sont transmis au conteneur) ET `sh -c` pour
# développer $APP. Le `exec` est essentiel : sans lui, le shell resterait le
# processus 1 et Next ne recevrait jamais le signal d'arrêt.
CMD ["sh", "-c", "cd \"apps/$APP\" && exec npx next start --port 3000"]
