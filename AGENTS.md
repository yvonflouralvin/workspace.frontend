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
    ventes/       → port 3011  (Facturation — nom d'affichage ; dossier/id restent "ventes")
    dashboard/    → port 3012  (Rapports temps réel agrégés — contrat de reporting)
    web/                       (landing page)
    docs/                      (documentation)
  packages/
    ui/                        (@repo/ui — inclut src/charts/ : LineChart, BarChart, Sparkline SVG)
    reporting-widgets/         (@repo/reporting-widgets — KpiCard, ReportWidget, TableWidget…)
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
| `stock-inventaire` | 3010 | Gestion des stocks et inventaires — articles, catégories, mouvements (backend `stock` port 5009) |
| `ventes`    | 3011 | **Facturation** (nom d'affichage ; id/backend restent `ventes`) — Clients, Produits (catégories, prix, TVA), Commandes, Factures, Paramètres. Produits/clients locaux, lien optionnel vers Stock/Tiers. Auto-enregistrement de produits par d'autres apps (ex. hosto) avec champs verrouillés. | — |
| `dashboard` | 3012 | Rapports temps réel agrégés. Découvre le contrat de reporting de chaque app (backend `dashboard`), rend les rapports via `@repo/reporting-widgets` avec rafraîchissement live. Voir le contrat de reporting dans l'`AGENTS.md` racine. | — |
| `web`       | —    | Landing page publique                              | —                                      |
| `docs`      | —    | Documentation produit                              | —                                      |

---

### Module Form (app `workspace`)

Formulaires façon Google Forms : conception (`/forms/{id}`), réponse
(`/forms/{id}/repondre`), dépouillement (`/forms/{id}/resultats`) et **page
publique `/f/{jeton}`**.

**`/forms` = « mes envois ».** La page listait trois choses en onglets — ce que je
conçois, ce qu'on m'a partagé, ce que je peux remplir — trois métiers sur un même
écran. Elle ne répond plus qu'à la question de tout le monde : ce que J'AI envoyé et
où ça en est (`GET /formulaires/mes-envois`, paginé côté serveur). « Nouveau » ouvre
la palette (`@repo/ui/PaletteRecherche`, le geste de la recherche globale) sur le
catalogue ; « Créer » n'apparaît qu'avec `projects.formulaires.creer` — concevoir
n'est pas répondre. Les formulaires que je conçois vivent sur `/forms/miens`.

**Ce que d'autres apps attendent de moi** (`components/TachesAilleurs.tsx`, écran
`/tasks`) : une demande d'approbation dont c'est mon tour apparaît dans « Mes
tâches ». Bloc à part, jamais fondu dans la liste — ces tâches n'ont ni état, ni
priorité, ni échéance, et ne se cochent pas ici : elles se terminent là où elles se
jouent. Contrat côté `projects` (`POST /internal/taches`, `/internal/taches/clore`).

**Catalogue unique — `/forms/remplir`.** Deux moteurs répondent à la même question
de l'utilisateur, « quel formulaire puis-je remplir ? » : le module Formulaire, qui
consigne une réponse, et les circuits d'`approval-flows`, qui font circuler une
demande. Un formulaire publié restait donc introuvable selon l'endroit où l'on
cherchait. `app/lib/catalogue-formulaires.ts` réunit **la porte, pas les moteurs** :
les formulaires `portee=a_remplir` plus les circuits `configured && catalogue_visible`
(réglage « Au catalogue » dans la console approval-flows — un flux porté par une app
reste masqué tant que personne ne l'ouvre, parce que l'app a en général sa propre
porte). Chaque source est interrogée avec la session de l'utilisateur : ses droits
s'appliquent sans être rejoués côté client, et la panne d'une source rend une liste
vide plutôt qu'une erreur — l'autre reste remplissable. L'écran DIT ce qui se passe
après l'envoi ; c'est la seule différence qui compte, et elle compte après avoir
choisi, pas pendant qu'on cherche.

**Un formulaire peut partir en approbation.** Réglage « Après l'envoi » dans les
paramètres (`approbation_flow_id` = le `slug` d'un circuit d'`approval-flows`). Le
formulaire garde ses questions, le circuit ne fournit que ses étapes — un même
circuit sert donc plusieurs formulaires, et la demande porte son propre
`fields_snapshot` pour que l'approbateur lise les questions posées. La demande part
**au nom du répondant** (son cookie est relayé), d'où l'exclusion entre circuit et
lien public : une approbation a besoin d'un demandeur identifié. Si le circuit ne
répond pas, la soumission entière est annulée — une réponse enregistrée sans
demande ouverte n'aurait aucune reprise. La décision revient par un rappel interne
et se lit dans les résultats (colonne « Approbation », reprise dans l'export CSV).

**La page publique est la seule route de l'app joignable sans compte.** Deux
endroits l'autorisent, et il faut les tenir ensemble : `proxy.ts` (préfixes
`/f/` et `/api/public/`, plus l'en-tête `x-pathname` qu'il pose) et
`app/layout.tsx`, qui saute sa redirection vers auth quand ce chemin est public.
Le BFF `/api/public/*` relaie **en clair** — le visiteur n'a pas la clé
`@repo/network`, et n'a aucune raison de l'avoir. Côté backend, la charge
publique est volontairement pauvre : ni identifiant, ni collaborateurs, ni
compteur. Un formulaire ouvert ne doit rien apprendre du workspace qui
l'héberge.

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

**Éditeur de texte riche** (`src/RichTextEditor.tsx`, importé `@repo/ui/RichTextEditor`) :
éditeur type Notion bâti sur **BlockNote** (menu slash, blocs déplaçables, tableaux),
thémé sur les tokens du design system. Rendu client uniquement (`next/dynamic`,
`ssr: false`) et **non contrôlé après montage** — l'appelant debounce lui-même les
sauvegardes. Toute app qui a besoin d'un champ texte riche doit passer par ce composant
plutôt que d'ajouter un autre éditeur. Détail : `docs/packages/UI.md`.

**Primitives d'agenda** (`src/Timeline.tsx`, `src/CalendrierMois.tsx`, `src/GrilleHoraire.tsx`) :
trois vues du temps, sans aucune sémantique métier — la frise répond à « comment ça
s'enchaîne », le calendrier mensuel à « qu'est-ce qui tombe ce jour-là », la grille horaire
à « à quelle heure, et qu'est-ce qui se chevauche ». Toutes trois prennent des barres et des
libellés, rendent un `PanneauSurvol` au survol et remontent un `id` au clic. Consommées par
l'échéancier d'un projet et par le module Calendrier du workspace.

**Note module Agenda** : la page principale (`/agenda`) est une LISTE — ce qu'il y a à
faire, du plus proche au plus lointain, avec les échéances dépassées en tête. Le
calendrier (`/agenda/calendrier`) reste accessible par un bouton : il répond à « où ça
tombe dans le mois », bon pour poser un rendez-vous, mauvais pour lire une charge de
travail. Les deux écrans partagent `components/agenda/entrees.tsx` (teintes, natures,
panneau de survol, groupes de filtre). `/calendar` redirige vers `/agenda`.

**Menu d'affichage** (`src/MenuAffichage.tsx`) : bouton + popover portalisé, groupes
d'options cochables et **barre de recherche portant sur tous les groupes à la fois**.
Remplace les rangées de puces de filtre — elles tiennent à cinq, débordent à dix, et n'ont
nulle part où accueillir la suivante. `parDefaut` évite que la pastille compte les options
cochées d'origine. Consommé par le module Calendrier (natures + étiquettes).

**Aperçu de fichier** (`src/ApercuFichier.tsx`) : `ApercuFichier` (vignette image, lecteur
vidéo/audio, ligne nommée sinon) + `VisionneuseImage` (plein écran portalisé) +
`poidsLisible`. La FAMILLE d'aperçu (`image | video | audio | pdf | aucun`) est décidée par
le serveur à partir du type MIME et transmise dans la charge utile — un écran ne
réinterprète jamais une liste de types MIME dans son coin.

**Primitives de graphiques** (`src/charts/`, importées `@repo/ui/charts/LineChart`…) :
`LineChart` (courbe temporelle), `BarChart` (histogramme catégoriel), `Sparkline` — **SVG
natif, aucune dépendance de charting**, thémées via les tokens (`var(--color-*)`). Extraites
des courbes maison d'hosto (constantes vitales / tendances labo). Toute nouvelle app qui trace
une courbe doit réutiliser ces primitives plutôt que réécrire du SVG.

### `@repo/reporting-widgets`

Widgets de rapport **présentationnels** (données via props, aucun fetch → réutilisables par
n'importe quelle app), bâtis sur `@repo/ui/charts`.

```ts
import { ReportWidget } from '@repo/reporting-widgets/ReportWidget'
import { KpiCard } from '@repo/reporting-widgets/KpiCard'
```

`ReportWidget` (`{ report, data }`) est l'aiguilleur : il rend les sections présentes dans le
payload (`kpis` → `KpiGrid`, `series` → `BarChartWidget`/`LineChart`, `table` → `TableWidget`).
C'est la brique à embarquer pour afficher un rapport issu du contrat de reporting (cf.
`AGENTS.md` racine). Consommé par l'app `dashboard` ; ajouter le package à `transpilePackages`
et `@source ".../packages/reporting-widgets/src"` dans le `globals.css` de toute app
consommatrice.

### `@repo/design-system`

**`src/tokens.css` est la source unique des tokens** (`@theme` Tailwind v4) : couleurs,
filets, statuts, priorités, rôles, espacements, typographie, ombres, animations. Chaque
app l'importe depuis son `globals.css` :

```css
@import "tailwindcss";
@import "../../../packages/design-system/src/tokens.css";
@source "../../../packages/ui/src";
```

**Ne jamais redéclarer un bloc `@theme` dans une app** — les 8 apps portaient auparavant
une copie identique du même bloc, qui divergeait dès qu'on en modifiait une seule. Un
nouveau token s'ajoute dans `tokens.css`, point.

Les familles de polices sont chargées par le `layout.tsx` de chaque app via `next/font`
(`--font-geist-sans`, `--font-geist-mono`, `--font-inter`) ; `tokens.css` s'y branche avec
un repli littéral. Une app qui ne charge pas encore Inter retombe sur la police système.

Le reste du package (tokens TS compilés vers `dist/`) alimente l'ancienne config Tailwind
et n'est pas consommé par les apps.

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

### `@repo/notifications`

Notifications **in-app** entre utilisateurs (cloche + feed + configuration), branchées
sur le hub `backends/notifications`. Modèle source (consommé via `transpilePackages` +
`@source`), même esprit que `@repo/approval-flows`.

```ts
import { NotificationBell } from '@repo/notifications/NotificationBell'
import { NotificationSettings } from '@repo/notifications/NotificationSettings'
```

`NotificationBell` (`{ basePath? }`, défaut `/api/notifications`) : cloche + badge non-lus
+ popover du feed ; à placer dans le slot `notifications` du `TopBar`. **Temps réel** : le
hook `useNotifications` ouvre un **WebSocket** (`/ws/notifications`, même origine, routé par
nginx vers la gateway dédiée `wd_bk_notifications_realtime`) ; à réception d'un signal il
refait le fetch chiffré du feed. Reconnexion backoff + **polling 30 s en fallback** si le WS
tombe. Aucune config front : l'URL est dérivée de `window.location`. À l'**arrivée** d'une
notif temps réel : **son** (ding Web Audio synthétisé, pas de fichier) + **toast** en haut à
droite (`NotificationToaster`, portalisé sur `body`, auto-dismiss 6 s, clic → navigation).
Le hook détecte les nouvelles notifs par diff d'ids (aucun toast pour l'historique au chargement).
**Web Push** (notifs OS même page fermée) : `PushToggle` (bouton dans le popover) enregistre le
Service Worker (`apps/<app>/public/sw.js`) + s'abonne via `PushManager` (clé VAPID récupérée du
hub). Routes BFF `/api/notifications/push/{public-key,subscribe,unsubscribe}`. Requiert HTTPS.
`NotificationSettings` (`{ appKey, basePath?, groupsPath?, permissionsPath? }`) : UI de
configuration à embarquer dans les Paramètres d'une app — par type de notification,
choix des canaux (in_app/email/whatsapp) et des destinataires (groupes + permissions).
L'app consommatrice ajoute ses routes BFF sous `/api/notifications/*`
(`route`, `unread-count`, `[id]/read`, `read-all`, `config`, `config/[typeKey]`,
`groups`, `permissions`) qui `forwardToBackend` vers `NOTIFICATIONS_API_URL`. Intégrée
dans `hosto` (cloche + section Paramètres › Notifications). Détail du hub et du contrat :
`AGENTS.md` racine.

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
| `outline`                  | `#777587`   | Bordures marquées                  |
| `outline-variant`          | `#c7c4d8`   | Séparations de structure (sidebar, top bar) |
| `outline-soft`             | `#e5eeff`   | **Bordure par défaut** des cartes, inputs, boutons secondaires |
| `hairline`                 | `#f1f5ff`   | Filet entre lignes de liste        |
| `hairline-soft`            | `#f7f9ff`   | Filet interne le plus léger        |
| `surface-row-alt`          | `#fbfcff`   | Entête de tableau, zébrage         |
| `overlay`                  | `rgb(11 28 48 / .4)` | Fond des drawers et modales |
| `track`                    | `#dce0ea`   | Jauges et barres inactives         |
| `secondary`                | `#006c49`   | Accents verts                      |
| `tertiary`                 | `#004598`   | Accents bleus                      |
| `error`                    | `#ba1a1a`   | États d'erreur                     |
| `error-container`          | `#ffdad6`   | Fond d'erreur                      |

**Tokens sémantiques métier** (mêmes conventions `x` / `x-container`) :
`status-{backlog,todo,doing,review,done}` (statuts de tâche),
`priority-{urgent,high,medium,low,none}`,
`role-{owner,admin,member}`, `member-{active,invited}`.

**Ombres** : `shadow-button`, `shadow-card`, `shadow-drawer`, `shadow-modal`, `shadow-toast`.
**Animations** : `animate-overlay-in`, `animate-drawer-in`, `animate-pop-in`, `animate-toast-in`.

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
| `rounded-sm`    | 4px       |
| `rounded-lg`    | 8px       |
| `rounded-xl`    | 12px      |
| `rounded-2xl`   | 16px      |
| `rounded-full`  | 9999px    |

Cartes = `rounded-2xl`, contrôles et inputs = `rounded-lg`, petites cartes internes =
`rounded-xl`, pastilles = `rounded-full`.

> ⚠️ **Piège largeurs.** Les tokens `--spacing-*` écrasent l'échelle des largeurs nommées :
> `max-w-md` vaut **16px**, pas 28rem. Toujours une valeur arbitraire pour une modale ou un
> drawer (`max-w-[28rem]`, `w-[460px]`).

---

## Next.js 16 — Règles importantes

- **App Router uniquement.** Pas de `pages/`.
- **`"use client"`** obligatoire pour tout composant avec hooks React ou events browser.
- **Server Components par défaut** — ne pas mettre `"use client"` inutilement.
- **IMPORTANT :** Next.js 16 a des breaking changes. Avant d'écrire du code Next.js, lire le guide dans `node_modules/next/dist/docs/` de l'app concernée.
- Route Groups : `(dashboard)` pour grouper sans affecter l'URL.
- **`allowedDevOrigins` (⚠️ obligatoire derrière nginx/Dokploy).** En dev, Next 16
  **bloque silencieusement** les ressources internes (RSC/HMR/chunks) servies à une
  origine absente de `allowedDevOrigins`. Servie sur son domaine public
  (`auth-dev.saas.cd`…), l'app rend le HTML SSR mais **le composant client n'hydrate
  jamais** → un `<form>` part en soumission native GET, les handlers `onClick`/`onSubmit`
  ne s'exécutent pas. Chaque `apps/*/next.config.ts` doit ajouter le host de son domaine
  public, piloté par sa variable `<APP>_APP_URL` :
  ```ts
  const allowedDevOrigins = ["127.0.0.1", "localhost"];
  if (process.env.AUTH_APP_URL) {
    try { allowedDevOrigins.push(new URL(process.env.AUTH_APP_URL).host); } catch {}
  }
  ```
  Un changement de `next.config` impose un redémarrage du conteneur `next dev`.

---

## Variables d'environnement

Chaque app a son propre `.env` (`apps/<app>/.env`) — Next.js charge l'env depuis le
répertoire de l'app, pas depuis la racine du monorepo. Le `.env` à la racine de
`frontends/` existe mais n'est **pas** chargé automatiquement par les apps ; garder
les 3 `.env` par app synchronisés pour les variables communes.

> **Stack docker (`docker-compose.dev.yml`).** Là, toute la config vit dans le `.env`
> **racine du workspace** (chargé par chaque conteneur via `env_file: ./.env`) — cf.
> `AGENTS.md` racine. Chaque app y attend en plus sa variable **`<APP>_APP_URL`**
> (domaine public, ex. `AUTH_APP_URL=https://auth-dev.saas.cd`) consommée par
> `allowedDevOrigins` (voir section Next.js 16). Les backends n'ont pas de domaine :
> le navigateur ne les joint jamais (BFF), seul le serveur Next les appelle via
> résolution docker (`<SVC>_API_URL=http://wd_bk_<svc>:5000`).
>
> **Piège chiffrement → `decrypt_failed`.** `NETWORK_ENCRYPTION_KEY` doit être un
> **base64 valide décodant vers 16/24/32 octets** (générer : `openssl rand -base64 32` —
> **pas** du hex), et `NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY` (navigateur) doit valoir
> **exactement** la même chose que `NETWORK_ENCRYPTION_KEY` (serveur BFF). Sinon le BFF
> ne peut pas déchiffrer ce que le navigateur a chiffré → `{"error":"decrypt_failed"}`.
> Après un changement de clé : rebuild du bundle + **vider le cache du navigateur**
> (l'ancienne clé `NEXT_PUBLIC_*` reste inlinée dans le JS chargé précédemment).

| Variable                          | Valeur dev             | Portée         |
|-----------------------------------|------------------------|----------------|
| `NEXT_PUBLIC_AUTH_API`            | `http://127.0.0.1:5000`| Browser        |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`| `http://localhost:3001` | Browser        |
| `NEXT_PUBLIC_AUTH_API_HR_DOMAIN`  | `http://localhost:3003` | Browser        |
| `NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN` | `http://localhost:3006` | Browser — utilisé par le sélecteur d'apps (`workspace`, `hr`) pour pointer vers `approval-flows` |
| `HOSTO_API_URL`                   | `http://127.0.0.1:5007`| Server only — app `hosto`, proxy vers le backend FastAPI `hosto` |
| `NOTIFICATIONS_API_URL`           | `http://wd_bk_notifications:5000`| Server only — proxy BFF vers le hub `notifications` (cloche in-app + config). Docker uniquement (pas de port localhost exposé) |
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

**Motifs transverses déjà extraits** — les réutiliser plutôt que réinventer :
`LockedBadge` / `LockedBanner` (objet publié par une autre app : puce ambre, bandeau,
fond `locked-surface`), `ActiveFilters` (résumé des filtres actifs + réinitialisation),
`SettingRow` (nom + description + valeur + contrôle), `KpiCard`, `PriorityBars`,
`ConfirmDialog` / `Toast` (**plus aucun `confirm()` ni `alert()` natif**), `SearchField`,
`Avatar`, `Chip`, `Switch`, `Pagination` (numéros fenêtrés + ellipses — ne jamais rendre
les `pages` numéros d'un coup, la barre déborde).

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
- `docs/apps/dashboard/DASHBOARD.md` — App reporting/widgets : lecture directe des bases, sources de données, types de widget, roadmap
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
