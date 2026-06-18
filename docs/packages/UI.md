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

```tsx
<MultiSelect
  options={groups.map((g) => ({ id: g.id, label: g.name }))}
  selectedIds={groupIds}
  onChange={setGroupIds}
  placeholder="Rechercher un groupe…"
/>
```

### `AccessDenied` (`src/AccessDenied.tsx`)

Server Component (pas de `"use client"`, aucune interactivité) — écran plein-page affiché
quand un utilisateur authentifié n'a pas la permission `<app>.access` requise pour ouvrir
une application. Utilisé dans le `RootLayout` de `workspace` et `hr`, à la place de
`<SessionProvider>`, dès que `!session.permissions.includes("<key>.access")`.

```tsx
<AccessDenied appName="RH" />
```

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
