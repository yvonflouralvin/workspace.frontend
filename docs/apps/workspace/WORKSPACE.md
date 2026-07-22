# Architecture du Dashboard Workspace

## Vue d'ensemble

Le dashboard suit un modèle **shell partagé + contenu spécifique à chaque app**. Le shell (sidebar + topbar) vit dans `packages/ui` pour être réutilisé par toutes les apps du monorepo (workspace, hr, docs…). Chaque app passe ses propres items de navigation et son contenu.

---

## Structure des fichiers

```
packages/ui/src/
  shell/
    AppShell.tsx          ← layout racine : sidebar + topbar + slot contenu
    Sidebar.tsx           ← sidebar générique avec slot topSlot + navItems
    TopBar.tsx            ← barre du haut : recherche, app selector, profil
    AppSelector.tsx       ← popover : apps récentes, recherche, lien "toutes les apps"
  WorkspaceSwitcher.tsx   ← lit useSessionStore, partagé entre toutes les apps
  AccessDenied.tsx        ← écran d'accès refusé, partagé
  types/
    shell.ts              ← types partagés : NavItem, AppDefinition, UserSummary

apps/workspace/
  app/
    (dashboard)/
      layout.tsx          ← monte AppShell avec nav workspace + WorkspaceSwitcher
      page.tsx            ← page d'accueil du dashboard
      preferences/
        page.tsx          ← préférences utilisateur
      apps/
        page.tsx          ← toutes les applications disponibles
```

---

## Composants partagés (`packages/ui`)

### `AppShell`

Layout racine. Reçoit la sidebar et la topbar configurées, plus le slot enfant.

```tsx
<AppShell sidebar={<Sidebar ... />} topBar={<TopBar ... />}>
  {children}
</AppShell>
```

Rendu :
```
┌─────────────────────────────────────────────┐
│  Sidebar │  TopBar                           │
│          │─────────────────────────────────  │
│          │  {children}                       │
└─────────────────────────────────────────────┘
```

---

### `Sidebar`

Composant générique. Ne connaît pas le concept de "workspace" — il reçoit tout par props.

**Props :**
```ts
interface SidebarProps {
  topSlot?: ReactNode        // slot pour le workspace switcher (ou rien)
  navItems: NavItem[]        // items principaux de navigation
  secondaryItems?: NavItem[] // items secondaires (Settings, Aide…)
  user: UserSummary          // affiché en bas avec bouton logout
}
```

**Structure visuelle :**
```
┌──────────────────────┐
│  [topSlot]           │  ← WorkspaceSwitcher (workspace) ou logo (hr)
│──────────────────────│
│  navItems            │  ← liens principaux
│──────────────────────│
│  secondaryItems      │  ← Settings, Aide
│──────────────────────│
│  [avatar] user name  │  ← user menu + logout
└──────────────────────┘
```

---

### `TopBar`

Barre horizontale supérieure. Partagée entre toutes les apps.

**Props :**
```ts
interface TopBarProps {
  apps: AppDefinition[]      // liste de toutes les apps disponibles
  allAppsUrl: string         // lien vers la page "toutes les apps"
  user: UserSummary          // pour le menu profil
  preferencesUrl: string     // lien vers les préférences utilisateur
  notificationsCount?: number
}
```

**Structure visuelle :**
```
┌────────────────────────────────────────────────────────┐
│  [🔍 Rechercher…]   [::] App selector    [🔔] [avatar] │
└────────────────────────────────────────────────────────┘
```

- **Recherche** : bouton qui ouvre un dialog/modal de recherche globale
- **App selector** (`[::]`) : popover (voir `AppSelector`)
- **Notifications** : icône cloche avec badge, ouvre un panel latéral
- **Avatar profil** : menu déroulant → Préférences, Déconnexion

---

### `AppSelector`

Popover déclenché par le bouton app selector dans la TopBar.

**Comportement :**
1. **Apps récentes** (par défaut) — stockées dans `localStorage` via hook `useRecentApps`
2. **Recherche** — champ de recherche filtrant `apps[]`
3. **Lien "Toutes les apps"** — redirige vers `allAppsUrl`

```
┌─────────────────────────┐
│ 🔍 Rechercher une app…  │
│─────────────────────────│
│ Récentes                │
│  [W] Workspace          │
│  [H] RH                 │
│─────────────────────────│
│ → Toutes les applications│
└─────────────────────────┘
```

---

## Types partagés (`packages/ui/src/types/shell.ts`)

```ts
interface NavItem {
  label: string
  href: string
  icon: ReactNode
  badge?: number        // ex: nombre de notifications inbox
  exact?: boolean       // pour le matching de route active
}

interface AppDefinition {
  id: string
  name: string
  icon: string | ReactNode
  url: string           // URL de l'app (peut être cross-origin)
  color?: string        // couleur d'accentuation pour l'icône/avatar
  description?: string
}

interface UserSummary {
  id: number
  username: string
  email: string
  avatarUrl?: string    // initiales en fallback si absent
}
```

---

## Intégration dans l'app Workspace

Le layout `(dashboard)/layout.tsx` assemble le shell avec les éléments spécifiques au workspace.

```tsx
// apps/workspace/app/(dashboard)/layout.tsx
import { AppShell, Sidebar, TopBar } from '@repo/ui/shell/AppShell'
import { WorkspaceSwitcher } from '@repo/ui/WorkspaceSwitcher'

const NAV_ITEMS = [
  { label: 'Accueil',   href: '/home',    icon: <HomeIcon /> },
  { label: 'Projets',   href: '/projects', icon: <FolderIcon /> },
  { label: 'Membres',   href: '/members',  icon: <GroupIcon /> },
  { label: 'Inbox',     href: '/inbox',    icon: <InboxIcon />, badge: 3 },
]

const SECONDARY_ITEMS = [
  { label: 'Paramètres', href: '/settings', icon: <SettingsIcon /> },
  { label: 'Aide',       href: '/help',     icon: <HelpIcon /> },
]

const APPS: AppDefinition[] = [
  { id: 'workspace', name: 'Workspace', icon: '🏢', url: 'http://localhost:3005', color: '#3525cd' },
  { id: 'hr',        name: 'RH',        icon: '👥', url: 'http://localhost:3006', color: '#006c49' },
]

export default function DashboardLayout({ children }) {
  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher />}
          navItems={NAV_ITEMS}
          secondaryItems={SECONDARY_ITEMS}
        />
      }
      topBar={
        <TopBar
          apps={APPS}
          allAppsUrl="/apps"
          preferencesUrl="/preferences"
        />
      }
    >
      {children}
    </AppShell>
  )
}
```

`WorkspaceSwitcher` (`@repo/ui`) connaît `useSessionStore` — il est passé en slot à la Sidebar générique, partagé par toutes les apps (pas propre à `workspace`).

---

## WorkspaceSwitcher (`packages/ui/src/WorkspaceSwitcher.tsx`)

Partagé entre toutes les apps (déplacé hors de `apps/workspace` quand `hr` en a eu besoin
pour son propre écran `AccessDenied`).

```tsx
// Lit useSessionStore pour activeWorkspace + workspaces[]
// Affiche : [avatar couleur] [Nom du workspace] [ChevronDown]
// Click → Popover :
//   • Liste des workspaces (checkmark sur l'actif), filtrée par `filterPermission` si fourni
//   • Divider
//   • [+] Créer un workspace  → `${NEXT_PUBLIC_WORKSPACE_DOMAIN}/onboarding/new-workspace` (lien absolu)
```

**Mode restreint :** si `!activeWorkspace.is_owner && activeWorkspace.restrict_members_to_workspace`,
le composant rend une version statique (avatar + nom, pas de chevron, pas de popover, pas de
lien de création) — implémente la politique "pas de switcher, pas de création de workspace"
pour les membres non-owner d'un workspace `organization` qui l'a activée (voir
`backends/docs/services/auth/AUTH.md`, section `Workspace`). L'owner n'est jamais concerné.

**Prop `filterPermission?: string`** — ne liste que les workspaces où
`ws.permissions.includes(filterPermission)`. Utilisé par `AccessDenied` (ex.
`filterPermission="hr.access"`) pour ne proposer que les workspaces où l'app courante est
réellement accessible, plutôt que tous les workspaces de l'utilisateur. Sans cette prop,
tous les workspaces sont listés (cas de `workspace` — l'app "maison", accès garanti par
définition pour tout membre).

**Convention transversale — switcher toujours visible :** chaque `DashboardShell` (toutes
les apps) passe `<WorkspaceSwitcher />` en `topSlot` du `Sidebar`, pour pouvoir changer de
workspace sans devoir repasser par `workspace`. Dans une app où l'accès n'est pas garanti
(`hr` et toute future app non-`workspace`), filtrer avec `filterPermission="<key>.access"`
(même valeur que celle utilisée dans `AccessDenied` de cette app) pour éviter de proposer un
workspace où l'utilisateur atterrirait immédiatement sur l'écran `AccessDenied`.

**Convention transversale — "Accueil" renvoie toujours vers `workspace` :** dans
`DashboardShell`, l'item de nav "Accueil" doit toujours pointer vers l'app `workspace`,
quelle que soit l'app courante. Dans `apps/workspace` lui-même, `href="/"` suffit (c'est
déjà son propre accueil). Dans toute autre app (`hr`...), `href` doit être l'URL **absolue**
de `workspace` (`process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN`) — `next/link` gère nativement
les `href` absolus cross-origin (même technique que `AppSelector` pour changer d'app).

---

## Page "Toutes les applications" (`apps/workspace/app/(dashboard)/apps/page.tsx`)

Page listant toutes les apps disponibles sous forme de grille de cartes.  
C'est la destination du lien "Toutes les applications" dans l'AppSelector.

---

## Flux de données

### Session — chargement server-side {#session-ssr}

`app/layout.tsx` (Server Component) appelle `getServerSession()` (`@repo/auth/api/session.server`)
qui forwarde les cookies de la requête entrante vers `AUTH_API_URL` (Flask, server-to-server,
via `next/headers`). Le résultat est passé en prop `initialSession` à `<SessionProvider>`.

`SessionProvider` crée un store Zustand **par requête/montage** (`createSessionStore(initialSession)`
dans `packages/auth/src/store/session.store.ts`, via `useState` lazy init — jamais un singleton
module global, pour éviter toute fuite de session entre requêtes concurrentes côté serveur) et
l'expose via React Context. Le store est donc déjà rempli (`loading: false`, `user`, `activeWorkspace`,
`workspaces`) dès le tout premier rendu, y compris le rendu SSR — aucun flash "Chargement…" au
chargement de la page d'accueil.

`useSessionStore(selector?)` lit ce contexte (lève une erreur si utilisé hors `SessionProvider`).
Si `initialSession` n'est pas fourni (apps sans SSR de session), le provider retombe sur
`loadSession()` (fetch client classique via le proxy `/api/auth/session`).

```
RootLayout (Server Component)
      │  getServerSession() ── cookies forwardés ──▶ AUTH_API_URL (Flask)
      ▼
SessionProvider (Client) ── crée le store par montage, hydraté avec initialSession
      │
      ├── WorkspaceSwitcher  →  activeWorkspace, workspaces[]
      │
      └── DashboardShell     →  user → Sidebar (user menu) + TopBar (avatar)
```

Les `apps[]` passées à la TopBar sont déclarées statiquement dans le layout pour l'instant (liste des apps du monorepo). Elles pourront être chargées depuis l'API quand la liste sera dynamique.

---

## Membres & Groupes RBAC

`/members` et `/members/groups` consomment l'API RBAC du backend `auth`
(`backends/docs/services/auth/AUTH.md`) via des routes proxy Next.js qui forwardent
le cookie `access_token` server-to-server (même pattern que `/api/auth/session`).

```
app/api/workspaces/[workspaceId]/
  members/route.ts                              GET, POST
  members/check-email/route.ts                   POST (gated members.invite)
  members/[membershipId]/route.ts                DELETE
  members/[membershipId]/permissions/route.ts    PUT
  members/[membershipId]/groups/route.ts         PUT
  groups/route.ts                                GET, POST
  groups/[groupId]/route.ts                      PATCH, DELETE
  groups/[groupId]/permissions/route.ts          PUT
app/api/permissions/route.ts                     GET (catalogue)
app/api/switch-workspace/route.ts                POST
```

`app/api/switch-workspace/route.ts` est requis par `switchWorkspace` du store
`@repo/auth` (`session.store.ts`) — appelle ce proxy same-origin, pas `AUTH_API`
directement (un appel direct cross-origin échouait en 401 : le cookie `access_token`
est scopé à l'hôte qui a servi la page, jamais envoyé vers `127.0.0.1:5000` depuis le
navigateur). Toute app utilisant `useSessionStore().switchWorkspace` doit exposer ce
même proxy.

Toutes délèguent à `app/lib/server/proxy.ts` (`forwardToAuthApi`), qui forwarde
cookie + méthode + body vers `AUTH_API_URL`.

**Client (`app/lib/api.ts`)** : `listMembers(workspaceId, { search?, limit?, offset? })`
→ `{ members, total }` (recherche/pagination **côté serveur**, voir plus bas),
`checkMemberEmail`, `createMember`, `removeMember`, `setMemberPermissions`,
`setMemberGroups`, `listGroups`, `createGroup`, `updateGroup`, `deleteGroup`,
`setGroupPermissions`, `listPermissions`.

**Pages :**
- `/members` — `@repo/ui/DataList` en mode `serverMode` (recherche/pagination par
  `GET /auth/workspaces/<id>/members?q=&limit=&offset=` — voir
  `backends/docs/services/auth/AUTH.md`, debounce 300ms géré localement dans la page,
  pas via `useGraphQLRecords` qui est spécifique au gateway GraphQL ; `auth` reste un
  service REST classique). Colonnes : membre (avatar + nom + email + badge owner),
  groupes (`Badge`). Clic sur une ligne → `MemberDetailDrawer`
  (`@repo/ui/RightDrawer` — profil résumé : avatar, groupes, permissions effectives,
  boutons "Gérer les permissions"/"Retirer du workspace" gardés par
  `usePermissions().can(...)`). Modals :
  - `AddMemberModal` — assistant en 2 étapes. Étape 1 : email seul, soumis à
    `checkMemberEmail` (gated `members.invite`, distinct du check-email public).
    Si `already_member` → erreur, pas d'étape suivante. Étape 2 : si le compte existe déjà,
    affiche juste son nom/email (lecture seule) + `MultiSelect` des groupes ; sinon,
    affiche aussi `Nom complet` + `PasswordInput` (`generatable`) avant les groupes.
    `onCreated` déclenche un refetch de la liste plutôt que de muter un state local
    (pagination serveur — le nouveau membre n'est pas forcément sur la page courante).
  - `MemberPermissionsModal` — `MultiSelect` pour les groupes, `PermissionPicker`
    (accordéon + recherche par app) pour les permissions directes. Toujours ouvert
    depuis le drawer (bouton "Gérer les permissions"), pas depuis la ligne de table.
- `/members/groups` — arbre des groupes (`GroupTree`, récursif sur `parent_id`,
  pas d'héritage automatique des permissions) + panneau d'édition
  (`GroupEditorPanel` : nom, description, permissions ; protégé si `is_system`)
  + `CreateGroupModal`.

**Composants partagés ajoutés à `packages/ui/src/`** (règle du monorepo — primitives
réutilisables) : `Modal.tsx`, `Badge.tsx`, `Checkbox.tsx`.

### Catalogue de permissions groupé par application

`listPermissions()` retourne désormais `{ groups: AppPermissionGroup[] }` (catalogue
groupé par app — voir `backends/docs/services/auth/AUTH.md`) au lieu d'une liste plate.
`GroupEditorPanel` et `MemberPermissionsModal` rendent chaque entrée comme une section
avec en-tête (`"GÉNÉRAL"`, `"WORKSPACE"`, `"RH"`...) au lieu d'une liste de checkboxes
non structurée.

### Gating d'accès à l'application

`app/layout.tsx` (Server Component) vérifie après `getServerSession()` que
`session.permissions.includes("workspace.access")` ; sinon rend `<AccessDenied>` (`@repo/ui`)
**à l'intérieur** de `<SessionProvider>` (pas à sa place — nécessaire pour que le
`WorkspaceSwitcher` passé en slot ait accès au store de session). `AccessDenied` reçoit
`workspaceName` (nom du workspace actif) et, si l'utilisateur a accès à `workspace.access`
dans au moins un autre de ses workspaces, un `switcher={<WorkspaceSwitcher filterPermission="workspace.access" />}`
qui ne liste que ces workspaces-là. Un membre sans ce droit ne peut pas ouvrir l'app, même
connecté (le owner du workspace garde son bypass total côté backend).

`components/DashboardShell.tsx` filtre la liste `APPS` passée à `<TopBar>` avec
`usePermissions().can(\`${app.id}.access\`)` — un membre sans `hr.access` ne voit plus
"RH" dans le sélecteur d'apps.

---

## Paramètres

`/settings` (`app/(dashboard)/settings/page.tsx`) consomme
`GET`/`PUT /auth/workspaces/<id>/settings` (catalogue de paramètres groupé par app,
fusionné avec les valeurs du workspace — voir `backends/docs/services/auth/AUTH.md`),
via le proxy `app/api/workspaces/[workspaceId]/settings/route.ts` (même pattern
`forwardToAuthApi` que `members`/`groups`). Gardée par
`usePermissions().can("workspace.settings.manage")`.

**Client (`app/lib/api.ts`)** : `listWorkspaceSettings(workspaceId)`,
`updateWorkspaceSettings(workspaceId, values)` (utilisée avec un seul élément dans le
tableau pour l'édition unitaire décrite ci-dessous).

**Types (`app/lib/types.ts`)** : `SettingType` (`text`/`date`/`single_choice`/
`multi_choice`), `SettingOption`, `SettingDef` (inclut `section: string | null` — une app
peut regrouper ses paramètres sous une section, voir `backends/docs/services/auth/AUTH.md`),
`AppSettingGroup`.

**UI :** layout deux colonnes.
- Gauche — recherche + liste des groupes ("Général", "Workspace", "RH"...), un seul
  sélectionné à la fois (mirrors la recherche de `PermissionPicker`, sans l'accordéon —
  ici on *sélectionne* un groupe au lieu de tous les afficher en même temps, pour rester
  lisible même avec beaucoup d'apps enregistrées). Pas affecté par la recherche de droite.
- Droite — pour le groupe sélectionné : un champ de recherche (filtre par
  nom/description, scope = le groupe sélectionné seulement, pas une recherche globale
  cross-apps), puis les paramètres filtrés partitionnés par `section` :
  - `section === null` → liste à plat, lecture seule.
  - `section` renseignée → un `Accordion` (`@repo/ui/Accordion`, composant générique
    réutilisable, voir `docs/packages/UI.md`) par section, titre = nom de la section,
    badge = nombre de paramètres, forcé ouvert pendant une recherche active.
  - Chaque paramètre s'affiche en **lecture seule** (nom, description, valeur formatée via
    `formatSettingValue` : libellé de l'option pour `single_choice`, libellés joints pour
    `multi_choice`, date localisée `fr-FR`, `"—"` si vide) + une icône crayon
    (`EditOutlined`) qui ouvre `components/SettingValueDrawer.tsx` (`RightDrawer`
    `@repo/ui`) pour éditer puis enregistrer ce paramètre seul — pas de formulaire inline
    ni de bouton "Enregistrer" global sur la page.

`MultiSelect` (`packages/ui/src/MultiSelect.tsx`) a été généralisé : `OptionLike.id` et
`selectedIds`/`onChange` acceptent désormais `string | number` (avant : `number` seul),
pour pouvoir représenter les valeurs de `single_choice`/`multi_choice` (des chaînes,
ex. `"fr"`, `"liste"`) en plus des ids numériques (groupes, permissions). Changement non
cassant — voir `docs/packages/UI.md`.

### Restriction des membres (organization uniquement)

Dans le panneau "Général" de `/settings`, si `getWorkspace(workspaceId).type === "organization"`,
un bloc dédié (`RestrictionToggle`, composant local à `settings/page.tsx`) affiche un
interrupteur "Restreindre les membres à ce workspace" — **pas** un `SettingDef` du catalogue
générique : c'est un champ dédié sur `Workspace` côté `auth` (`type`/
`restrict_members_to_workspace`), pas un paramètre déclaré par une app. Sauvegarde
**immédiate** au changement (`updateWorkspacePolicy`, `PATCH /api/workspaces/[workspaceId]`)
— endpoint et état de chargement/erreur distincts du bouton "Enregistrer" des paramètres
génériques. Voir `backends/docs/services/auth/AUTH.md` pour le détail des garde-fous serveur
(`POST /auth/workspaces`, `POST /auth/switch-workspace`).

### Authentification de l'organisation (organization + restriction active uniquement)

Toujours dans le panneau "Général", si `type === "organization" &&
restrict_members_to_workspace === true` (les deux conditions, pas l'une ou l'autre), un
second bloc dédié (`OrgAuthProviderSection`, local à `settings/page.tsx`) propose un
sélecteur "Aucun / Microsoft Entra / Google Workspace / Code par email" + un champ
conditionnel (`Tenant ID` pour Entra, `Domaine` pour Google Workspace, aucun champ pour le
code par email) — sauvegardé via `updateWorkspaceAuthProvider(workspaceId, provider,
config)`, qui réutilise `PATCH /api/workspaces/[workspaceId]` (mêmes champs
`auth_provider`/`auth_provider_config` que `restrict_members_to_workspace`, validés
serverside, voir `backends/docs/services/auth/AUTH.md`). Le bloc disparaît si la restriction
est désactivée (le serveur rejetterait la sauvegarde de toute façon).

### Notifications (config des canaux par workspace)

Toujours dans le panneau "Général", **inconditionnel** (contrairement aux deux blocs
précédents — `sender_mode="workspace"` s'applique à tout type de workspace, pas
seulement `organization`) : un `Accordion` "Notifications" listant les 3 canaux
(`email`/`sms`/`whatsapp`) avec un statut "Configuré"/"Non configuré" et un crayon
(`EditOutlined`) par ligne. Consomme `GET /auth/workspaces/<id>/notification-channels`
(`listNotificationChannels`) au chargement de la page (même `Promise.all` que
`listWorkspaceSettings`/`getWorkspace`), via le proxy
`app/api/workspaces/[workspaceId]/notification-channels/route.ts` (`forwardToAuthApi`,
voir `backends/docs/services/auth/AUTH.md` pour `notification_channels_bp`).

Le crayon ouvre `components/NotificationChannelDrawer.tsx` (`RightDrawer`, composant
local à l'app — couplé à `NotificationChannel`, pas un composant `@repo/ui`) : champs
contrôlés générés depuis une map figée *côté frontend uniquement* (le backend reste un
dict JSON libre de bout en bout, sans schéma serveur) :
- `email` : `host`, `port`, `username`, `password`, `from_email`.
- `sms` : `provider`, `api_key`, `api_secret`, `sender_id`.
- `whatsapp` : `provider`, `phone_number_id`, `access_token`, `business_account_id`.

Valeurs initiales = `config` existant (chaîne vide si absent) — **aucun masquage** des
champs secrets au rechargement (limite connue et acceptée, voir
`backends/docs/services/notifications/NOTIFICATIONS.md` et
`backends/docs/services/auth/AUTH.md`) ; `type="password"` sur les champs sensibles est
cosmétique uniquement. Bouton "Enregistrer" → `updateNotificationChannelConfig(workspaceId,
channel, config)` (`PUT
/api/workspaces/[workspaceId]/notification-channels/[channel]/config`) → ferme le drawer
et met à jour la ligne du canal dans l'état de la page.

---

## Préférences (`app/(dashboard)/preferences/page.tsx`)

Liste les 4 méthodes d'authentification (`Mot de passe`, `Google`, `Microsoft`, `Code par
email`) via `getMyAuthMethods()` (`GET /api/me/auth-methods` → `GET /auth/me/auth-methods`) :
- `password`/`email_otp` — interrupteur on/off (`updateMyAuthMethod`, `PUT
  /api/me/auth-methods/<provider>`).
- `google`/`microsoft` — si non lié : bouton "Lier" (`<a href="/api/oauth/<provider>/start?
  intent=link">`, navigation directe, pas de fetch — voir le proxy ci-dessous) ; si lié :
  email du compte externe affiché + interrupteur + bouton "Délier"
  (`unlinkMyAuthMethod`, `DELETE /api/me/auth-methods/<provider>`).

**Héritage d'une politique d'organisation :** si `enforced_provider` est renvoyé par
`GET /auth/me/auth-methods` (l'utilisateur est membre non-owner d'un workspace restreint
avec une politique active, voir section précédente), une bannière "Géré par votre
organisation : ..." s'affiche et **tous les contrôles sont désactivés** (`disabled`) —
implémente directement la demande "le membre ne peut pas modifier ses préférences tant que
la politique s'applique".

**Proxies dédiés** (`app/api/oauth/[provider]/start|callback/route.ts`, distincts de ceux
de `apps/auth` — même rationale, voir `docs/apps/auth/AUTH.md`) : `start` ne sert ici que
`intent=link` (l'utilisateur est déjà authentifié, le cookie est forwardé pour que Flask
sache qui lie son compte) ; `callback` ne réémet pas de cookies de session (l'utilisateur
en a déjà), redirige simplement vers `/preferences` (avec `?oauth_error=...` en cas
d'échec).

**Types (`app/lib/types.ts`)** : `AuthMethodProvider`, `AuthMethod`, `AuthProvider`.
**API (`app/lib/api.ts`)** : `getMyAuthMethods`, `updateMyAuthMethod`, `unlinkMyAuthMethod`,
`updateWorkspaceAuthProvider`.

**Limite connue (0.5.0)** — OAuth non testé en live, voir `docs/apps/auth/AUTH.md` (même
limite, même cause : pas d'identifiants Google/Microsoft réels dans cet environnement).

---

## Créer un workspace (`app/(dashboard)/onboarding/new-workspace/page.tsx`)

Page liée depuis `WorkspaceSwitcher` ("+ Créer un workspace"). Formulaire : nom + sélecteur
de type (deux cartes "Individuel"/"Organisation", `Individuel` présélectionné) →
`createWorkspace(name, type)` (`app/lib/api.ts`) → `POST /api/workspaces` (nouveau proxy,
`app/api/workspaces/route.ts`) → `window.location.href = "/"` (le nouveau workspace est déjà
actif côté serveur après création, comme à l'inscription).

Garde-fou frontend (defense-in-depth, l'enforcement réel est le `403` serveur) : si
`!activeWorkspace.is_owner && activeWorkspace.restrict_members_to_workspace`, affiche "Accès
restreint" au lieu du formulaire.

**Proxy `app/api/workspaces/[workspaceId]/route.ts`** (`GET`/`PATCH`, nouveau) — détail et
politique du workspace, consommé par `/settings` (section ci-dessus).

**Types (`app/lib/types.ts`)** : `WorkspaceType`, `WorkspaceDetail`.
**API (`app/lib/api.ts`)** : `createWorkspace`, `getWorkspace`, `updateWorkspacePolicy`.

---

## Journal d'activité (`app/(dashboard)/audit-logs/page.tsx`)

Liste les logs d'audit (connexions, changements de permissions, et tout autre
événement futur) émis par les services backend vers le nouveau microservice
`audit_logs` (port 5006, base dédiée — voir `backends/docs/services/audit_logs/AUDIT_LOGS.md`).
Gardée par `usePermissions().can("audit_logs.view")` — affiche un message
d'accès refusé inline plutôt que `AccessDenied` (même pattern que `/members`),
puisque c'est une page secondaire et non l'app entière.

**Proxies** (`app/api/audit-logs/route.ts`, `app/api/audit-logs/facets/route.ts`) —
`forwardToBackend` vers `AUDIT_LOGS_API_URL`, même pattern que `approval-flows`
(pas de `forwardToAuthApi`, ce n'est pas le service `auth`).

**Client (`app/lib/api.ts`)** : `listAuditLogs(filters)` → `{ logs, total }`
(pagination serveur), `getAuditLogFacets()` → valeurs distinctes vues
(`event_types`, `applications`, `devices`, `locations`, `ip_addresses`) pour
peupler dynamiquement les filtres — aucune liste de valeurs codée en dur côté
frontend, le champ `type` étant libre côté backend.

**UI** — modelée sur `apps/approval-flows/app/page.tsx` : `DataList` en
`serverMode`, recherche debouncée 300ms (couvre aussi les métadonnées JSON
libres côté backend), colonnes Date/Email/Application (badge)/Type (badge)/
Emplacement/IP/Device+Navigateur. `RightDrawer "Filtres"` : email (texte libre),
intervalle de dates **du/au** (deux `<input type="date">`, contrairement à la
date unique d'`approval-flows`), emplacement (`<select>`), IP/devices/type/
application (`MultiSelect`, alimentés par les facets).

**Types (`app/lib/types.ts`)** : `AuditLog`, `AuditLogFacets`.

---

## Shell — variante « search-first »

`TopBar` accepte `variant` : `"breadcrumbs"` (défaut, disposition historique conservée
pour les autres apps) ou **`"search-first"`**, la disposition du design system — pilule de
recherche à gauche (largeur max 420), actions à droite (grille d'apps, cloche, avatar 32),
pas de fil d'Ariane. L'app `workspace` est la première à l'adopter ; les autres basculeront
au fur et à mesure.

Le `UserFooter` affiche une **ligne de rôle** sous le nom (`subtitle`). Le service auth ne
stocke pas de rôle : `DashboardShell` le déduit — propriétaire du workspace, sinon
`workspace.settings.manage` ou `members.manage` → « Administrateur », sinon « Membre ».
La même dérivation alimente la colonne Rôle de la page Membres (`app/lib/members.ts`).

---

## Membres — page refondue

**Annuaire** (`app/(dashboard)/members/page.tsx` + `components/members/MembersTable.tsx`) :
recherche 300 px debouncée 300 ms côté serveur, puis une carte `rounded-2xl` contenant
l'entête `label-sm` MAJUSCULES sur `surface-row-alt`, les lignes cliquables, et la
pagination serveur (20/page) en pied. Colonnes : **Membre** (avatar + nom + email, suffixe
« (vous) ») · **Rôle** · **Groupes** · **Dernière connexion** · **Statut**. Squelette
shimmer pendant le chargement.

> **Données manquantes côté auth.** `last_login_at` et `is_active` ne sont pas servis par
> `_serialize_member` (`backends/auth/routes/members.py`) : les champs sont **optionnels**
> dans `Member` et les colonnes affichent « — » et « Actif » tant qu'ils sont absents.
> `last_login_at` demande en plus une colonne et une écriture au login.

**Drawer de détail** (`components/MemberDetailDrawer.tsx`, largeur 460) : identité,
Rôle / Statut / Dernière connexion, groupes en chips, puis les **permissions effectives
groupées par application** — libellé lisible (`permission.description`, la clé technique
passe en `title`) et provenance : point + chip `Direct`, ou chip gris portant le nom du
groupe qui apporte le droit (`app/lib/members.ts#effectivePermissions` croise le catalogue,
`member.permissions`, `member.direct_permissions` et les permissions des groupes).

**Pas d'empilement de surfaces** : « Gérer les permissions » et « Réinitialiser le mot de
passe » ouvrent un **panneau inline** dans le drawer, pas une modale par-dessus.
`MemberPermissionsModal` a été supprimé ; le panneau porte à la fois les groupes
(`MultiSelect`) et les permissions directes (`PermissionPicker`).

**Ajout d'un membre** : modale 2 étapes avec indicateur « Étape n/2 » — email seul et
vérification serveur, puis nom complet + mot de passe (bouton **Générer**) + groupes, ou
une simple carte de rappel si le compte existe déjà.

**Confirmations et erreurs** : `ConfirmDialog` et `Toast` de `@repo/ui`. Plus aucun
`confirm()` / `alert()` natif sur cette page.

---

## Paramètres — page refondue

Corps en `grid 256px / 1fr`. **Colonne gauche** : recherche d'application puis le catalogue
dans un cadre `rounded-xl` scrollable (max 448) — icône (mappée par clé d'app dans la page,
`WidgetsOutlined` en repli), nom, compteur ; ligne active en `primary/10`. **Colonne
droite** : le panneau de l'application, carte `rounded-2xl`.

**Général** empile trois blocs distincts : restriction des membres (interrupteur
`@repo/ui/Switch`, écriture immédiate), authentification de l'organisation (affichée si la
restriction est active, écriture immédiate), et l'accordéon Notifications (Email / SMS /
WhatsApp avec point d'état + crayon → drawer 400). Les paramètres du groupe Général
s'affichent ensuite comme ceux des autres apps.

Chaque source est chargée **séparément** : le catalogue et le détail du workspace d'un
côté, les canaux de notification de l'autre. Un service indisponible dégrade son seul bloc
(message « service injoignable ») au lieu de vider toute la page.

**Autres apps** : recherche de paramètre, titre `label-sm` MAJUSCULES, puis les paramètres
sans section dans un cadre et ceux avec section sous un sous-titre — via
`@repo/ui/SettingRow` (voir `docs/packages/UI.md`).

### Modifications en attente

Le panneau tient un **tampon `pending`** indexé par identifiant de paramètre. L'édition en
ligne (`toggle`, `single_choice`) **et** le drawer y écrivent — le drawer dit d'ailleurs
« Appliquer », pas « Enregistrer », pour lever l'ambiguïté. Une **barre collante** en bas du
panneau annonce le nombre de modifications non enregistrées et propose `Annuler` (vide le
tampon) / `Enregistrer` (un seul `PUT` groupé sur `/settings`, l'API acceptant déjà un
tableau de valeurs).

C'est un changement de comportement : avant, chaque drawer écrivait immédiatement au
serveur. Les deux blocs de politique du panneau Général restent en écriture immédiate —
ce sont des endpoints distincts, pas des `app_setting`.

---

## Accueil — page refondue

**Régime établi** : trois `KpiCard` (`@repo/ui`) — *Mes tâches ouvertes*, *Projets actifs*,
*Notifications non lues* — puis deux colonnes `1fr / 320px`. À gauche « Mon travail » (mes
tâches triées par échéance, échéance dépassée en `error`) et « Mes approbations » ; à
droite « Accès rapides » et « Activité récente ».

**Premier jour** : si le workspace n'a aucun projet et que l'utilisateur peut créer un
projet ou inviter, une carte d'onboarding remplace les KPI. Les cinq étapes se cochent
d'après l'état réel (équipe = plus d'un membre, notifications = un canal configuré) ; les
liens d'action ne s'affichent qu'avec la permission correspondante.

**Adaptation au rôle** — une seule page, pas de variante. Chaque bloc est gardé par sa
permission (`audit_logs.view`, `members.view`, `workspace.settings.manage`…) et **chaque
source échoue en silence** : un bloc sans droit ou sans donnée disparaît, il ne casse
jamais la page. Les accès rapides sont filtrés par `projects.manage`, `members.invite`,
`workspace.settings.manage`.

**Sources** : `projectsApi.listProjects` / `myTasks`, `useNotifications`, `listAuditLogs`
(feed d'activité), `listMembers` et `listNotificationChannels` (onboarding), et
`@repo/approval-flows/api/client` pour les approbations.

> **Pas de sparkline.** Les cartes du handoff en prévoient une ; aucune API n'expose de
> série temporelle. `KpiCard` accepte un `visual` optionnel — à remplir le jour où la
> donnée existe. En attendant, l'indice sous la valeur est **calculé** (« 2 en retard »,
> « 9 tâches au total »), pas décoratif.

### `approval_flows` dans l'app workspace

Deux routes BFF ajoutées (`app/api/approval-flows/requests/route.ts` et
`.../requests/[id]/decide/route.ts`) qui `forwardToBackend` vers `APPROVAL_FLOWS_API_URL`,
plus `@repo/approval-flows` en dépendance et dans `transpilePackages`. La page consomme le
client du package et rend ses propres cartes — pas les composants du package — donc pas de
`@source` à ajouter.

---

## Ordre d'implémentation

1. `packages/ui/src/types/shell.ts` — types
2. `packages/ui/src/shell/Sidebar.tsx` — sidebar générique
3. `packages/ui/src/shell/TopBar.tsx` + `AppSelector.tsx`
4. `packages/ui/src/shell/AppShell.tsx` — assemblage
5. `packages/ui/src/WorkspaceSwitcher.tsx`
6. `apps/workspace/app/(dashboard)/layout.tsx` — intégration
7. `apps/workspace/app/(dashboard)/page.tsx` — contenu home
8. `apps/workspace/app/(dashboard)/apps/page.tsx` — toutes les apps
