# App Auth — Documentation

**Port :** 3001
**Next.js 16, App Router**
**Rôle :** Connexion et inscription. Redirige vers `workspace` (3005) en cas de succès.

---

## Pages

### `/` — Login (`app/page.tsx`)

Boutons "Continuer avec Google"/"Continuer avec Microsoft" toujours visibles en haut
(`intent=login`, liens directs vers `/api/oauth/<provider>/start` — pas besoin de fetch,
navigation complète du navigateur). Puis formulaire :
1. **Email** → `checkEmail()` puis `getLoginMethods(email)`. Si le compte n'existe pas :
   erreur inline + lien `/register`. Si un seul mode est disponible et que ce n'est pas
   `password` : passe directement à ce mode (OTP envoyé automatiquement, ou message
   invitant à utiliser le bouton OAuth correspondant si le compte est verrouillé sur
   Google/Microsoft par une politique d'organisation).
2. **Password** → `login()`. En cas de succès : redirect vers `NEXT_PUBLIC_WORKSPACE_DOMAIN`.
   Si `email_otp` fait partie des méthodes disponibles, un lien "Recevoir un code par email
   à la place" bascule vers l'étape OTP.
3. **OTP** (si applicable) — champ à 6 chiffres, `verifyOtp()`. En mode dev
   (`MAIL_DEV_MODE`), le code est affiché directement sous le champ pour pouvoir tester sans
   vraie boîte mail. Lien "Renvoyer le code".

Bouton "Changer" permet de revenir à l'étape email depuis n'importe quelle étape suivante.

### `/register` — Inscription (`app/register/page.tsx`)

Mêmes boutons OAuth en haut (`intent=register` — même route, le backend décide
création/connexion selon que l'email existe déjà). Puis wizard avec barre de progression et
navigation "Retour", dont le nombre d'étapes dépend de la méthode choisie :
1. **Email** → `checkEmail()`. Si le compte existe déjà : erreur + lien `/`.
2. **Nom complet**
3. **Mot de passe** + confirmation (min 8 caractères) — **ou**, via le lien "Recevoir un
   code par email à la place", bascule `signupMethod` sur `"otp"` et saute directement à
   l'étape suivante (pas de mot de passe à saisir).
4. **Nom du workspace** — pré-rempli avec la partie avant `@` de l'email (slugifiée), éditable.
   Inclut aussi un sélecteur de **type** (deux cartes "Individuel"/"Organisation",
   `Individuel` présélectionné) — `workspaceType` envoyé comme `workspace_type` à
   `POST /auth/register`. Fixé à la création, pas modifiable depuis cette app (voir
   `backends/docs/services/auth/AUTH.md`, modèle `Workspace`).
5. **OTP** (uniquement si `signupMethod === "otp"`) — le code est envoyé en entrant sur
   cette étape (`requestOtp(email, "signup")`), affiché en mode dev, vérifié par
   `verifyOtp({..., purpose: "signup", fullName, workspaceName, workspaceType})` qui crée le
   compte et connecte directement (pas d'étape `register()`+`login()` séparée dans ce cas).

À la soumission finale (chemin mot de passe) : `register()` → `login()` → redirect vers
`NEXT_PUBLIC_WORKSPACE_DOMAIN`. Chemin OTP : `verifyOtp(...)` fait les deux d'un coup.

---

## Couche API (`app/lib/api.ts` + `app/api/*/route.ts`)

Le client appelle des **route handlers Next.js locaux** (sous `/api/*`), jamais le backend directement.

```
Browser → /api/check-email      → fetch(AUTH_API_URL/auth/check-email)
Browser → /api/login            → fetch(AUTH_API_URL/auth/login) → set httpOnly cookies
Browser → /api/register         → fetch(AUTH_API_URL/auth/register)
Browser → /api/login-methods    → fetch(AUTH_API_URL/auth/login-methods)
Browser → /api/otp/request      → fetch(AUTH_API_URL/auth/otp/request)
Browser → /api/otp/verify       → fetch(AUTH_API_URL/auth/otp/verify) → set httpOnly cookies
Browser → /api/oauth/<p>/start    (navigation directe, pas de fetch) → forward cookie → 302 vers Flask /auth/oauth/<p>/start → 307 vers le provider
Browser ← /api/oauth/<p>/callback (le provider redirige ici)         → fetch(AUTH_API_URL/auth/oauth/<p>/callback) → set httpOnly cookies → redirect WORKSPACE_DOMAIN
```

`redirect_uri` enregistré auprès de Google/Microsoft = `AUTH_APP_URL` + `/api/oauth/<provider>/callback`
(configuré côté backend, voir `backends/docs/services/auth/AUTH.md`) — **jamais** l'URL Flask
directement, même piège de cookie host-only que pour `/api/login` (voir gotcha plus bas).

### Fonctions client (`app/lib/api.ts`)

```ts
checkEmail(email)                               // → { exists: boolean }
login(email, password)                          // → void (cookies set via proxy)
register(email, password, fullName, workspaceName, workspaceType) // → void
getLoginMethods(email)                          // → { exists, methods: string[], enforced_provider }
requestOtp(email, purpose)                      // → { sent: true, dev_code? } — dev_code seulement si MAIL_DEV_MODE
verifyOtp({ email, code, purpose, fullName?, workspaceName?, workspaceType? }) // → void (cookies set via proxy)
```

---

## Cookie Gotcha — Pourquoi le proxy {#cookie-gotcha}

**Problème :** le backend tourne sur `127.0.0.1:5000` (macOS AirPlay occupe `localhost:5000`).
Si le browser appelait le backend directement, les cookies `access_token` / `refresh_token`
seraient scopés à `127.0.0.1` — invisibles depuis `localhost:3005` (workspace).

**Solution :** le route handler `/api/login` appelle le backend server-to-server
(`127.0.0.1:5000`, pas de browser impliqué), lit les tokens de la réponse JSON, puis
les ré-émet comme cookies `httpOnly` **sans attribut `Domain`** dans sa propre réponse.
Résultat : cookies host-only pour `localhost` — **pas scopés au port**, donc partagés
entre `localhost:3001` et `localhost:3005`.

**Règle absolue :** toujours ouvrir cette app via `http://localhost:3001`, jamais
`http://127.0.0.1:3001` — sinon le cookie ne sera pas visible par workspace.

---

## Variables d'environnement

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|-------------------------|
| `AUTH_API_URL`                    | Server  | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API`            | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`    | Browser | `http://localhost:3005`  |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`| Browser | `http://localhost:3001`  |

---

## Config notable

- `next.config.ts` : `allowedDevOrigins: ["127.0.0.1", "localhost"]` — le HMR WebSocket
  fonctionne quel que soit le host utilisé.
- `tailwind.config.ts` : étend `@repo/tailwind-config` — tous les tokens du design system
  sont disponibles.

---

## Relation avec les autres apps

- `apps/workspace/proxy.ts` — redirige vers `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`
  (cette app) quand le cookie `access_token` est absent.
- `packages/auth` (`@repo/auth`) — deux chemins de lecture de session :
  - **Server-side** (`getServerSession()`, `api/session.server.ts`) : appelle
    `AUTH_API_URL` directement depuis le serveur Next (cookies forwardés via
    `next/headers`), utilisé dans le `RootLayout` de `workspace` pour hydrater la
    session avant le premier rendu. Voir `docs/apps/workspace/WORKSPACE.md#session-ssr`.
  - **Client-side** (`getSession()`, `api/session.ts`) : appelle le proxy local
    `NEXT_PUBLIC_SESSION_API` (`/api/auth/session`), utilisé en fallback quand
    aucune session n'a été pré-chargée côté serveur (apps sans SSR de session).

---

## Limite connue (0.5.0) — OAuth non testé en live

Les boutons Google/Microsoft et les routes `/api/oauth/*` sont fonctionnels de bout en bout
(vérifié : redirection, structure de l'URL d'autorisation, gestion des erreurs de state),
mais **aucun test avec un vrai compte Google/Microsoft n'a pu être fait** — pas de
`GOOGLE_CLIENT_ID`/`MICROSOFT_CLIENT_ID` réels dans cet environnement de dev. À vérifier
avant un premier usage en prod.
