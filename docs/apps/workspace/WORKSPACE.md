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

**Client (`app/lib/api.ts`)** : `listMembers`, `checkMemberEmail`, `createMember`,
`removeMember`, `setMemberPermissions`, `setMemberGroups`, `listGroups`, `createGroup`,
`updateGroup`, `deleteGroup`, `setGroupPermissions`, `listPermissions`.

**Pages :**
- `/members` — tableau des membres (`Badge` par groupe), actions gardées par
  `usePermissions().can(...)` (`members.invite`, `members.manage`, `members.remove`).
  Modals :
  - `AddMemberModal` — assistant en 2 étapes. Étape 1 : email seul, soumis à
    `checkMemberEmail` (gated `members.invite`, distinct du check-email public).
    Si `already_member` → erreur, pas d'étape suivante. Étape 2 : si le compte existe déjà,
    affiche juste son nom/email (lecture seule) + `MultiSelect` des groupes ; sinon,
    affiche aussi `Nom complet` + `PasswordInput` (`generatable`) avant les groupes.
  - `MemberPermissionsModal` — `MultiSelect` pour les groupes, `PermissionPicker`
    (accordéon + recherche par app) pour les permissions directes.
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
`updateWorkspaceSettings(workspaceId, values)`.

**Types (`app/lib/types.ts`)** : `SettingType` (`text`/`date`/`single_choice`/
`multi_choice`), `SettingOption`, `SettingDef`, `AppSettingGroup`.

**UI :** layout deux colonnes, pas de composant `@repo/ui` dédié (sélecteur trop couplé
au concept de "groupe de paramètres" pour être généralisé maintenant) :
- Gauche — recherche + liste des groupes ("Général", "Workspace", "RH"...), un seul
  sélectionné à la fois (mirrors la recherche de `PermissionPicker`, sans l'accordéon —
  ici on *sélectionne* un groupe au lieu de tous les afficher en même temps, pour rester
  lisible même avec beaucoup d'apps enregistrées).
- Droite — formulaire du groupe sélectionné, un champ par `SettingDef.type` :
  `text`/`date` → `<input>` natif, `single_choice` → `<select>` natif, `multi_choice` →
  `MultiSelect` (`@repo/ui`).

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

## Ordre d'implémentation

1. `packages/ui/src/types/shell.ts` — types
2. `packages/ui/src/shell/Sidebar.tsx` — sidebar générique
3. `packages/ui/src/shell/TopBar.tsx` + `AppSelector.tsx`
4. `packages/ui/src/shell/AppShell.tsx` — assemblage
5. `packages/ui/src/WorkspaceSwitcher.tsx`
6. `apps/workspace/app/(dashboard)/layout.tsx` — intégration
7. `apps/workspace/app/(dashboard)/page.tsx` — contenu home
8. `apps/workspace/app/(dashboard)/apps/page.tsx` — toutes les apps
