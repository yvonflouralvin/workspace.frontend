# Frontends Monorepo — Instructions Agent

> Fichier maître. Lu en premier à chaque conversation. Les docs spécifiques sont dans `docs/`.

**Avant toute modification de code → lire `AGENT_GIT.md` et créer la branche appropriée.**

---

## Monorepo

**Gestionnaire de tâches :** Turborepo (`turbo.json`)
**Package manager :** npm (workspaces)
**TypeScript :** 5.9 — strict dans tous les packages
**Node :** >= 18

```
frontends/
  apps/
    auth/         → port 3001  (connexion / inscription)
    workspace/    → port 3005  (app principale SAAS)
    hr/           → port 3003  (module RH)
    approval-flows/ → port 3006  (création/gestion libre de workflows d'approbation)
    web/                       (landing page)
    docs/                      (documentation)
  packages/
    ui/                        (@repo/ui)
    auth/                      (@repo/auth)
    network/                   (@repo/network)
    design-system/             (@repo/design-system)
    tailwind-config/           (@repo/tailwind-config)
    state/                     (@repo/state)
    eslint-config/
    typescript-config/
```

**Démarrer tout le monorepo :** `npm run dev` (à la racine)
**Démarrer une app seule :** `cd apps/<name> && npm run dev`

---

## Apps — Responsabilités et ports

| App         | Port | Rôle                                               | Doc détaillée                           |
|-------------|------|----------------------------------------------------|-----------------------------------------|
| `auth`      | 3001 | Login 2 étapes + inscription 4 étapes              | `docs/apps/auth/AUTH.md`               |
| `workspace` | 3005 | App principale — dashboard, projets, membres, journal d'activité | `docs/apps/workspace/WORKSPACE.md`     |
| `hr`        | 3003 | Module RH (en construction)                        | `docs/apps/hr/HR.md`                   |
| `approval-flows` | 3006 | Création/gestion libre de workflows d'approbation + console des tâches | `docs/apps/approval-flows/APPROVAL_FLOWS.md` |
| `hosto`     | 3007 | Gestion hospitalière — patients, contacts                            | —                                      |
| `documents` | 3008 | Templates PDF — liste, éditeur layout JSON WeasyPrint, prévisualisation, paramètres workspace | — |
| `tiers`     | 3009 | Répertoire des clients et fournisseurs (backend `tiers` port 5008)   | —                                      |
| `stock-inventaire` | 3010 | Gestion des stocks et inventaires — articles, catégories, mouvements (backend `stock` port 5009) | — |
| `web`       | —    | Landing page publique                              | —                                      |
| `docs`      | —    | Documentation produit                              | —                                      |

---

## Packages partagés

### `@repo/auth`

Session et permissions partagées entre toutes les apps.

```ts
import { useSessionStore } from '@repo/auth/store/session.store'
import { SessionProvider } from '@repo/auth/SessionProvider'
```

**Store Zustand :** `loading`, `authenticated`, `user`, `activeWorkspace`, `workspaces[]`, `roles[]`, `permissions[]`
**API :** `getSession()` → `GET /api/auth/session` (proxy BFF de l'app courante, jamais Flask directement)
**Gotcha session :** voir `docs/apps/auth/AUTH.md#cookie-gotcha`

### `@repo/network`

Chiffrement des appels API internes — voir section "Variables d'environnement"
plus bas pour le détail. `apiFetch` (`./client`) remplace `fetch`/`axios` côté
navigateur, `forwardToBackend`/`decryptRequestBody`/`encryptResponseBody`
(`./server`) côté routes BFF.

```ts
import { apiFetch } from '@repo/network/client'
import { forwardToBackend } from '@repo/network/server'
```

### `@repo/ui`

Composants React partagés entre toutes les apps.

```ts
import { Button } from '@repo/ui/button'
import { AppShell, Sidebar, TopBar } from '@repo/ui/shell/AppShell'  // à construire
```

Exports configurés via `"exports": { "./*": "./src/*.tsx" }` — importer directement le fichier.
MUI Icons et MUI Material sont disponibles dans ce package et dans toutes les apps.

### `@repo/design-system`

Tokens de design (couleurs, espacements, typographie, border-radius) compilés depuis `src/` vers `dist/`.

```ts
// consommé via packages/tailwind-config
import theme from '@repo/design-system/dist/tailwind/theme'
```

**Ne jamais importer depuis `dist/` dans le code applicatif** — passer par Tailwind CSS ou les classes utilitaires.

### `@repo/tailwind-config`

Config Tailwind partagée. Toutes les apps l'étendent :

```ts
// tailwind.config.ts d'une app
import sharedConfig from "../../packages/tailwind-config/tailwind.config"
export default { content: [...], presets: [sharedConfig] }
```

### `@repo/state`

Package Zustand partagé (dépendance racine). Toujours préférer les stores de `@repo/auth` pour la session.

### `@repo/approval-flows`

Composants/hooks/client API pour intégrer le service `approval_flows` (port 5005)
dans n'importe quelle app — vraie logique (état, appels API), pas juste de l'UI, même
modèle que `@repo/auth`.

```ts
import { ApprovalFlowWrapper } from '@repo/approval-flows/ApprovalFlowWrapper'
import { ApprovalTaskList } from '@repo/approval-flows/ApprovalTaskList'
```

`ApprovalFlowWrapper` (`{ flowId, basePath?, externalRef?, callbackUrl?, onSubmitted? }`)
rend un formulaire de soumission généré depuis `fields_schema` — c'est le composant à
embarquer pour une intégration "mode 1" (template global, ex. `hr.leave_request`,
voir `docs/apps/hr/HR.md`). `ApprovalTaskList` (`{ mode: "tasks" | "submissions",
basePath? }`) liste les tâches d'approbation/soumissions de l'utilisateur. `basePath`
(défaut `/api/approval-flows`) pointe vers le proxy BFF de l'app **consommatrice** —
chaque app garde son propre BFF, jamais de coupling direct vers le BFF d'une autre
app. Détail complet : `docs/apps/approval-flows/APPROVAL_FLOWS.md`.

---

## Design System — Classes Tailwind disponibles

Le design system expose ses tokens comme classes Tailwind. Les voici référencés :

### Couleurs (usage : `bg-primary`, `text-on-surface`, etc.)

| Token                      | Valeur hex  | Usage                              |
|----------------------------|-------------|------------------------------------|
| `primary`                  | `#3525cd`   | Actions principales, liens actifs  |
| `primary-container`        | `#4f46e5`   | Hover sur primary                  |
| `on-primary`               | `#ffffff`   | Texte sur fond primary             |
| `background`               | `#f8f9ff`   | Fond global                        |
| `surface`                  | `#f8f9ff`   | Fond des cartes                    |
| `surface-container`        | `#e5eeff`   | Conteneurs                         |
| `surface-container-low`    | `#eff4ff`   | Conteneurs légers                  |
| `surface-container-lowest` | `#ffffff`   | Blanc pur                          |
| `on-surface`               | `#0b1c30`   | Texte principal                    |
| `on-surface-variant`       | `#464555`   | Texte secondaire                   |
| `outline`                  | `#777587`   | Bordures, séparateurs              |
| `outline-variant`          | `#c7c4d8`   | Bordures légères                   |
| `secondary`                | `#006c49`   | Accents verts                      |
| `tertiary`                 | `#004598`   | Accents bleus                      |
| `error`                    | `#ba1a1a`   | États d'erreur                     |
| `error-container`          | `#ffdad6`   | Fond d'erreur                      |

### Espacements (usage : `p-md`, `gap-lg`, etc.)

| Token    | Valeur |
|----------|--------|
| `xs`     | 4px    |
| `sm`     | 8px    |
| `md`     | 16px   |
| `lg`     | 24px   |
| `xl`     | 32px   |
| `gutter` | 20px   |
| `sidebar-width` | 260px |

### Typographie (usage : `font-display`, `text-headline-lg`, etc.)

Les classes `font-*` définissent la famille, les classes `text-*` définissent taille + line-height + weight.

| Classe `text-*`    | Taille | Usage                    |
|--------------------|--------|--------------------------|
| `text-display`     | 40px   | Titres héros             |
| `text-headline-lg` | 30px   | Titres de page           |
| `text-headline-md` | 24px   | Titres de section        |
| `text-headline-sm` | 20px   | Sous-titres              |
| `text-body-lg`     | 16px   | Corps de texte large     |
| `text-body-md`     | 14px   | Corps de texte standard  |
| `text-body-sm`     | 13px   | Texte secondaire         |
| `text-label-md`    | 12px   | Labels de formulaire     |
| `text-label-sm`    | 11px   | Labels petits / badges   |

Familles : `font-display` → Geist, `font-body-*` → Inter.

### Border radius

| Token           | Valeur    |
|-----------------|-----------|
| `rounded`       | 0.125rem  |
| `rounded-lg`    | 0.25rem   |
| `rounded-xl`    | 0.5rem    |
| `rounded-full`  | 0.75rem   |

---

## Next.js 16 — Règles importantes

- **App Router uniquement.** Pas de `pages/`.
- **`"use client"`** obligatoire pour tout composant avec hooks React ou events browser.
- **Server Components par défaut** — ne pas mettre `"use client"` inutilement.
- **IMPORTANT :** Next.js 16 a des breaking changes. Avant d'écrire du code Next.js, lire le guide dans `node_modules/next/dist/docs/` de l'app concernée.
- Route Groups : `(dashboard)` pour grouper sans affecter l'URL.

---

## Variables d'environnement

Chaque app a son propre `.env` (`apps/<app>/.env`) — Next.js charge l'env depuis le
répertoire de l'app, pas depuis la racine du monorepo. Le `.env` à la racine de
`frontends/` existe mais n'est **pas** chargé automatiquement par les apps ; garder
les 3 `.env` par app synchronisés pour les variables communes.

| Variable                          | Valeur dev             | Portée         |
|-----------------------------------|------------------------|----------------|
| `NEXT_PUBLIC_AUTH_API`            | `http://127.0.0.1:5000`| Browser        |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`| `http://localhost:3001` | Browser        |
| `NEXT_PUBLIC_AUTH_API_HR_DOMAIN`  | `http://localhost:3003` | Browser        |
| `NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN` | `http://localhost:3006` | Browser — utilisé par le sélecteur d'apps (`workspace`, `hr`) pour pointer vers `approval-flows` |
| `HOSTO_API_URL`                   | `http://127.0.0.1:5007`| Server only — app `hosto`, proxy vers le backend FastAPI `hosto` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`    | `http://localhost:3005` | Browser (auth) |
| `AUTH_API_URL`                    | `http://127.0.0.1:5000`| Server only    |
| `HR_API_URL`                      | `http://127.0.0.1:5001`| Server only — app `hr`, proxy vers le backend FastAPI `hr` |
| `AUDIT_LOGS_API_URL`              | `http://127.0.0.1:5006`| Server only — app `workspace`, proxy vers le backend FastAPI `audit_logs` (page "Journal d'activité") |
| `NETWORK_ENCRYPTION`              | `clear` \| `encrypted` (défaut `encrypted` si absent) | Server only — désactive le chiffrement `@repo/network` pour troubleshooter avec curl/Bruno/Postman sans déchiffrer à la main |
| `NETWORK_ENCRYPTION_KEY`          | clé AES-256 en base64, même valeur dans les 3 apps | Server only |
| `NEXT_PUBLIC_NETWORK_ENCRYPTION`  | `clear` \| `encrypted` — **doit toujours valoir la même chose que `NETWORK_ENCRYPTION`** | Browser |
| `NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY` | même clé que `NETWORK_ENCRYPTION_KEY` | Browser |

### `@repo/network` — chiffrement des appels API internes

Toutes les apps utilisent `@repo/network/client` (`apiFetch`, remplace `fetch`/`axios`
direct) côté navigateur et `@repo/network/server` (`forwardToBackend`,
`decryptRequestBody`, `encryptResponseBody`) côté routes BFF (`app/api/**/route.ts`)
pour chiffrer body + réponse (AES-256-GCM) de tout le trafic interne visible dans
l'onglet Network du navigateur. Le déchiffrement se termine toujours au niveau du
BFF Next.js — le trajet BFF→backend (Flask/FastAPI) reste en clair, déjà invisible
côté navigateur. **Limite connue :** la clé est nécessairement présente dans le
bundle JS navigateur — ce n'est pas une protection contre un attaquant qui lit le
bundle, seulement contre l'inspection casuelle (Network tab, screen-share support).

Routes explicitement exclues du wrapper (pas de body JSON à chiffrer) :
`app/api/oauth/[provider]/start|callback/route.ts` dans `apps/auth` et
`apps/workspace` — redirections pures vers/depuis le provider OAuth externe.
`app/api/employees/[id]/documents/route.ts` (`POST`, upload multipart) et
`app/api/employees/[id]/documents/[documentId]/content/route.ts` (`GET`, réponse
binaire) dans `apps/hr` — premier upload/téléchargement de fichier du monorepo, body/
réponse non-JSON, pass-through brut des octets + du cookie de session (voir
`docs/apps/hr/HR.md`).

**Troubleshooting :** mettre `NETWORK_ENCRYPTION=clear` et
`NEXT_PUBLIC_NETWORK_ENCRYPTION=clear` dans le `.env` de l'app concernée pour
revenir à du JSON en clair (comportement historique), sans rien déchiffrer à la
main. Les deux variables doivent toujours être modifiées ensemble.

---

## Conventions de code

- **Pas de commentaires** sauf si le WHY est non-évident (contrainte cachée, bug workaround).
- **Composants `'use client'`** uniquement si nécessaire — Server Components par défaut.
- **Imports cross-package** : toujours passer par le nom de package (`@repo/auth/...`), jamais par chemin relatif hors du package.
- **MUI Icons** : disponibles dans toutes les apps via `@mui/icons-material`. Préférer aux SVG inline.
- **Tailwind v4** dans toutes les apps : pas de `tailwind.config.js` dans `apps/workspace` (v4 via `@import "tailwindcss"` dans globals.css).
- **Zustand** : ne jamais créer de store local si `@repo/auth` couvre le besoin.

### Règle de composant partagé — OBLIGATOIRE

Avant de créer un composant UI dans une app, se poser la question : **ce composant pourrait-il servir à une autre app du monorepo ?**

Si oui (bouton, badge, carte, input, modal, avatar, popover, spinner, toast, etc.) → **le placer dans `packages/ui/src/` et l'importer via `@repo/ui/...`**, pas dans l'app elle-même.

**Exemples concrets :**
- Un bouton primaire → `packages/ui/src/Button.tsx`, importé `@repo/ui/Button`
- Un champ de recherche → `packages/ui/src/SearchInput.tsx`
- Une card de stats → `packages/ui/src/StatCard.tsx`
- Un avatar utilisateur → `packages/ui/src/Avatar.tsx`
- Un badge de notification → `packages/ui/src/Badge.tsx`

**Exception :** un composant reste dans l'app uniquement s'il est **intrinsèquement couplé à la logique métier de cette app** (ex: `WorkspaceSwitcher` dans workspace — il lit `useSessionStore` et connaît le concept de workspace). La règle de bon sens : si on doit l'expliquer avec le nom de l'app pour le décrire, il reste dans l'app.

En cas de doute → `packages/ui`.

---

## Git — Workflow de l'agent

Voir **`AGENT_GIT.md`** pour les règles complètes.

Résumé :
- Branche principale de l'agent : **`claude`**
- Toute modification → branche `claude-<type>/<nom>` créée depuis `claude`
- Fin de modification → push + PR vers `claude` via `gh pr create --base claude`
- Types : `feature`, `fix`, `refactor`, `docs`, `style`, `chore`
- Note : tiret entre `claude` et le type (pas de slash) — contrainte git, voir `AGENT_GIT.md`

---

## Tests — Règle minimale

Avant tout commit touchant une app : **`tsc --noEmit` doit passer à zéro**.
Avant toute PR : **`next build` doit réussir** + smoke test de la route modifiée.

Voir **`docs/TESTING.md`** pour la stratégie complète (niveaux 1→5, Vitest et Playwright à venir).

---

## Documentation détaillée

- `docs/apps/auth/AUTH.md` — App auth : login, inscription, cookie trick, proxy API
- `docs/apps/workspace/WORKSPACE.md` — Architecture dashboard workspace, shell partagé, composants
- `docs/apps/hr/HR.md` — Module RH (état actuel et à venir)
- `docs/apps/approval-flows/APPROVAL_FLOWS.md` — Création/gestion libre de workflows d'approbation
- `docs/packages/UI.md` — Guide des composants @repo/ui
- `docs/TESTING.md` — Stratégie de tests

> Les apps n'ont plus leurs propres AGENTS.md / CLAUDE.md. Le root CLAUDE.md + ce fichier + `docs/` couvrent tout. Claude Code remonte la hiérarchie et charge ces fichiers quelle que soit l'app en cours de travail.

---

## Maintenance de la documentation — OBLIGATOIRE

Après toute modification qui change la façon de travailler sur ce projet, **mettre à jour immédiatement** le fichier concerné :

| Type de changement                                      | Fichier à mettre à jour                          |
|---------------------------------------------------------|--------------------------------------------------|
| Nouvelle app ou nouveau package                         | Ce fichier (`AGENTS.md`) — section Monorepo      |
| Nouveau token Tailwind, couleur, espacement             | Ce fichier — section Design System               |
| Nouvelle convention de code ou règle transversale       | Ce fichier — section Conventions                 |
| Nouvelle variable d'environnement                       | Ce fichier + doc de l'app concernée              |
| Architecture ou composants majeurs dans workspace       | `docs/apps/workspace/WORKSPACE.md`               |
| Changement dans le flux auth / cookie / proxy           | `docs/apps/auth/AUTH.md`                         |
| Nouveaux composants dans `@repo/ui`                     | `docs/packages/UI.md`                            |
| Fonctionnalités RH ajoutées                             | `docs/apps/hr/HR.md`                             |
| Fonctionnalités ApprovalFlow ajoutées                    | `docs/apps/approval-flows/APPROVAL_FLOWS.md`     |

**Règle :** si le changement est assez important pour qu'on ait besoin de s'en souvenir à la prochaine session de travail, il doit être documenté avant de clore la tâche.
