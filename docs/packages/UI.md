# Package @repo/ui — Guide des composants

**Package :** `packages/ui`
**Import :** `import { X } from '@repo/ui/shell/X'` (exports `"./*": "./src/*.tsx"`)

---

## Composants existants

### `Button` (`src/button.tsx`)

Stub de base — usage interne uniquement. À remplacer par les composants MUI ou les composants shell.

### `Icon` (`src/Icon.tsx`)

Wrapper léger autour de Material Icons.

### `CommunHeaderLink` (`src/components/CommunHeaderLink.tsx`)

Injecte le lien Google Fonts pour Material Symbols Outlined dans le `<head>`. À inclure dans le layout racine des apps qui utilisent les icônes Material Symbols.

### `Modal` (`src/Modal.tsx`)

Dialog générique (overlay + panel centré, ferme sur `Escape`). Tailwind pur.

```tsx
<Modal title="Titre" onClose={() => ...} width="max-w-lg">
  {children}
</Modal>
```

### `Badge` (`src/Badge.tsx`)

Pastille colorée (ex : chip de groupe sur la page Membres).

```tsx
<Badge>Owner</Badge>
<Badge color="#006c49">Support</Badge>
```

### `Checkbox` (`src/Checkbox.tsx`)

Case à cocher stylée avec label + description optionnelle (ex : liste de permissions).

```tsx
<Checkbox checked={checked} onChange={setChecked} label="members.view" description="..." />
```

### `PermissionPicker` (`src/PermissionPicker.tsx`)

Sélecteur de permissions groupées par application (catalogue `GET /auth/permissions`).
Chaque groupe (Général, Workspace, RH...) est une section accordéon — une seule ouverte à
la fois — avec un champ de recherche qui filtre par nom de groupe ou par nom/description de
droit (déplie automatiquement les sections correspondantes pendant la recherche). Affiche le
nombre de droits cochés à côté du nom du groupe, même repliée.

```tsx
<PermissionPicker groups={permissionCatalog} selectedIds={permissionIds} onToggle={togglePermission} />
```

### `MultiSelect` (`src/MultiSelect.tsx`)

Sélecteur multiple générique avec recherche : tape pour filtrer une liste d'options, clic
pour ajouter, rendu en tag avec une croix pour retirer directement. Les options déjà
sélectionnées disparaissent de la liste déroulante (déjà visibles sous forme de tags).

`OptionLike.id`, `selectedIds` et `onChange` acceptent `string | number` (pas seulement
`number`) — pour pouvoir représenter aussi bien des ids numériques (groupes, permissions)
que des valeurs de paramètre `single_choice`/`multi_choice` (ex. `"fr"`, `"liste"`, voir
`/settings` dans `WORKSPACE.md`).

```tsx
<MultiSelect
  options={groups.map((g) => ({ id: g.id, label: g.name }))}
  selectedIds={groupIds}
  onChange={setGroupIds}
  placeholder="Rechercher un groupe…"
/>
```

### `PasswordInput` (`src/PasswordInput.tsx`)

Champ mot de passe avec icône afficher/masquer, et un bouton optionnel de génération
aléatoire (`generatable`) qui remplit le champ et bascule en clair automatiquement (pour
copier/partager le mot de passe généré).

```tsx
<PasswordInput value={password} onChange={setPassword} generatable placeholder="..." />
```

### `WorkspaceSwitcher` (`src/WorkspaceSwitcher.tsx`)

Lit `useSessionStore` (`activeWorkspace`, `workspaces`, `switchWorkspace`). Affiche le
workspace actif, popover avec la liste des autres + lien "Créer un workspace" (URL absolue
`${NEXT_PUBLIC_WORKSPACE_DOMAIN}/onboarding/new-workspace` — fonctionne depuis n'importe
quelle app, pas seulement `workspace`). Partagé entre toutes les apps (nécessite que l'app
courante expose un proxy same-origin `POST /api/switch-workspace`, voir
`docs/apps/workspace/WORKSPACE.md`).

**Prop `filterPermission?: string`** — restreint la liste aux workspaces où
`ws.permissions.includes(filterPermission)`. Utilisé par `AccessDenied` ; omis dans l'usage
normal (Sidebar) pour lister tous les workspaces.

**Mode restreint :** si `activeWorkspace.restrict_members_to_workspace` est vrai et que
l'utilisateur n'est pas owner de ce workspace (`!activeWorkspace.is_owner`), le composant
rend une version statique (avatar + nom, sans interaction) au lieu du bouton/popover —
aucune permission ne contrôle ça, c'est une politique de `Workspace` (organization
uniquement), pas du RBAC. `switchWorkspace` lève désormais une erreur si la réponse du
proxy n'est pas `ok` (au lieu de silencieusement recharger) ; `handleSwitch` l'attrape et
affiche une alerte.

```tsx
<WorkspaceSwitcher />
<WorkspaceSwitcher filterPermission="hr.access" />
```

### `AccessDenied` (`src/AccessDenied.tsx`)

Client Component — écran plein-page affiché quand un utilisateur authentifié n'a pas la
permission `<app>.access` requise pour ouvrir une application. Rendu **à l'intérieur** du
`<SessionProvider>` (pas à sa place) dans le `RootLayout` de `workspace` et `hr`, dès que
`!session.permissions.includes("<key>.access")` — nécessaire pour que le `switcher` (slot
optionnel, `WorkspaceSwitcher`, lui-même `useSessionStore`) ait accès au contexte. Affiche
aussi le nom du workspace ciblé (`workspaceName`) et un bouton de déconnexion intégré
(`/api/logout` + redirection vers `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`).

Le `switcher` n'est passé que si l'utilisateur a accès à l'app courante dans au moins un
**autre** de ses workspaces (`ws.permissions` par workspace, exposé par `/auth/session` et
`/auth/workspaces`) — sinon le bouton n'apparaît pas, pour ne jamais proposer une bascule
qui mènerait au même écran.

```tsx
<AccessDenied
  appName="Workspace"
  workspaceName={session.active_workspace?.name}
  switcher={
    session.workspaces.some(
      (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes("workspace.access")
    ) ? <WorkspaceSwitcher filterPermission="workspace.access" /> : undefined
  }
/>
```

### `DataList` (`src/DataList.tsx`)

Liste générique avec recherche intégrée et pagination — colonnes définies par l'app
appelante (`render` par colonne), pas de couplage à un modèle de données précis. Hauteur
plafonnée (`maxHeight`, défaut `max-h-[70vh]`) : header de recherche et pied de pagination
fixes (`shrink-0`), seul le corps (`flex-1 min-h-0 overflow-y-auto`) scrolle — le composant
ne dépasse donc jamais l'écran visible quel que soit le nombre d'éléments. `searchText`
reçoit un item et renvoie la chaîne à filtrer (concatène les champs pertinents).

```tsx
<DataList
  items={employees}
  columns={[
    { key: "name", header: "Employé", render: (e) => `${e.first_name} ${e.last_name}` },
    { key: "email", header: "Email", render: (e) => e.email },
  ]}
  getRowKey={(e) => e.id}
  searchText={(e) => `${e.first_name} ${e.last_name} ${e.email}`}
  searchPlaceholder="Rechercher un employé…"
  onRowClick={(e) => router.push(`/employees/${e.id}`)}
  pageSize={10}
/>
```

Utilisé par `apps/hr` pour la liste des employés et, dans le navigateur de dossiers
(`GroupFolderView`), pour les sous-groupes et les employés directs d'un groupe (voir
`docs/apps/hr/HR.md`).

---

## Shell partagé (à implémenter — voir `docs/apps/workspace/WORKSPACE.md`)

Les composants suivants sont à créer dans `src/shell/` :

### `AppShell` (`src/shell/AppShell.tsx`)

Layout racine. Assemble sidebar + topbar + contenu.

```tsx
<AppShell sidebar={<Sidebar ... />} topBar={<TopBar ... />}>
  {children}
</AppShell>
```

### `Sidebar` (`src/shell/Sidebar.tsx`)

Sidebar générique. Ne connaît pas le concept de "workspace".

```tsx
interface SidebarProps {
  topSlot?: ReactNode      // ex: WorkspaceSwitcher (propre à chaque app)
  navItems: NavItem[]
  secondaryItems?: NavItem[]
  user: UserSummary
}
```

### `TopBar` (`src/shell/TopBar.tsx`)

Barre supérieure. Recherche globale, sélecteur d'apps, profil utilisateur.

```tsx
interface TopBarProps {
  apps: AppDefinition[]
  allAppsUrl: string
  user: UserSummary
  preferencesUrl: string
  notificationsCount?: number
}
```

### `AppSelector` (`src/shell/AppSelector.tsx`)

Popover dans la TopBar : apps récentes, recherche, lien "Toutes les apps".

---

## Types partagés (`src/types/shell.ts`)

```ts
interface NavItem {
  label: string
  href: string
  icon: ReactNode
  badge?: number
  exact?: boolean
}

interface AppDefinition {
  id: string
  name: string
  icon: string | ReactNode
  url: string
  color?: string
  description?: string
}

interface UserSummary {
  id: number
  username: string
  email: string
  avatarUrl?: string
}
```

---

## Dépendances disponibles dans le package

- `@mui/material` + `@mui/icons-material` — icônes et composants MUI
- `@emotion/react` + `@emotion/styled` — styling MUI
- `tailwindcss` v4 — classes utilitaires
- `react` 19, `react-dom` 19

---

## Conventions

- Tous les composants shell sont des **Server Components par défaut**.
- Mettre `"use client"` uniquement sur les sous-composants interactifs (dropdowns, popovers).
- Ne jamais importer `useSessionStore` dans ce package — les données session sont passées par props depuis les apps.
- Les apps passent `user: UserSummary` au shell ; elles se chargent elles-mêmes de lire le store.
