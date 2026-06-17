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
  components/
    WorkspaceSwitcher.tsx ← client component propre au workspace, lit useSessionStore
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
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'

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

`WorkspaceSwitcher` est le seul composant qui connaît `useSessionStore` — il est propre à l'app workspace et passé en slot à la Sidebar générique.

---

## WorkspaceSwitcher (`apps/workspace/components/`)

```tsx
// Lit useSessionStore pour activeWorkspace + workspaces[]
// Affiche : [avatar couleur] [Nom du workspace] [ChevronDown]
// Click → Popover :
//   • Liste des workspaces (checkmark sur l'actif)
//   • Divider
//   • [+] Créer un workspace  → /onboarding/new-workspace
```

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
  members/[membershipId]/route.ts                DELETE
  members/[membershipId]/permissions/route.ts    PUT
  members/[membershipId]/groups/route.ts         PUT
  groups/route.ts                                GET, POST
  groups/[groupId]/route.ts                      PATCH, DELETE
  groups/[groupId]/permissions/route.ts          PUT
app/api/permissions/route.ts                     GET (catalogue)
```

Toutes délèguent à `app/lib/server/proxy.ts` (`forwardToAuthApi`), qui forwarde
cookie + méthode + body vers `AUTH_API_URL`.

**Client (`app/lib/api.ts`)** : `listMembers`, `createMember`, `removeMember`,
`setMemberPermissions`, `setMemberGroups`, `listGroups`, `createGroup`, `updateGroup`,
`deleteGroup`, `setGroupPermissions`, `listPermissions`.

**Pages :**
- `/members` — tableau des membres (`Badge` par groupe), actions gardées par
  `usePermissions().can(...)` (`members.invite`, `members.manage`, `members.remove`).
  Modals : `AddMemberModal`, `MemberPermissionsModal` (toggle groupes + permissions
  directes).
- `/members/groups` — arbre des groupes (`GroupTree`, récursif sur `parent_id`,
  pas d'héritage automatique des permissions) + panneau d'édition
  (`GroupEditorPanel` : nom, description, permissions ; protégé si `is_system`)
  + `CreateGroupModal`.

**Composants partagés ajoutés à `packages/ui/src/`** (règle du monorepo — primitives
réutilisables) : `Modal.tsx`, `Badge.tsx`, `Checkbox.tsx`.

---

## Ordre d'implémentation

1. `packages/ui/src/types/shell.ts` — types
2. `packages/ui/src/shell/Sidebar.tsx` — sidebar générique
3. `packages/ui/src/shell/TopBar.tsx` + `AppSelector.tsx`
4. `packages/ui/src/shell/AppShell.tsx` — assemblage
5. `apps/workspace/components/WorkspaceSwitcher.tsx`
6. `apps/workspace/app/(dashboard)/layout.tsx` — intégration
7. `apps/workspace/app/(dashboard)/page.tsx` — contenu home
8. `apps/workspace/app/(dashboard)/apps/page.tsx` — toutes les apps
