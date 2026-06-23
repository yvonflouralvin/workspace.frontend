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

### `RightDrawer` (`src/RightDrawer.tsx`)

Même conventions que `Modal` (overlay, ferme sur `Escape`, header titre+close,
`width` surchargable) mais ancré à droite, pleine hauteur. `width` est une largeur
**fixe** par défaut (`w-[600px] max-w-full`, pas un `max-w-*` sur `w-full` — un drawer
doit garder une largeur stable, seulement rétrécir sur mobile). La zone de contenu
(`flex-1 min-h-0 overflow-hidden`) a son propre padding via `contentClassName` (défaut
`"px-6 py-5"`) — passer `contentClassName=""` pour un contenu qui gère déjà son espacement
(typiquement un `DataList` en mode `bare` avec `maxHeight="h-full"`, pour éviter un cadre
dans le cadre et une double marge).

```tsx
<RightDrawer title="Titre" onClose={() => ...} contentClassName="">
  <DataList items={items} columns={columns} getRowKey={(i) => i.id} maxHeight="h-full" bare />
</RightDrawer>
```

Utilisé par `apps/hr` : `CreateEmployeeDrawer` (formulaire de création) et la liste des
employés d'un groupe dans `GroupFolderView` (voir `docs/apps/hr/HR.md`).

### `Tabs` (`src/Tabs.tsx`)

Liste d'onglets + panneau de contenu, Tailwind pur, état actif géré en interne. Pas
d'animation, pas de dépendance externe.

```tsx
<Tabs
  tabs={[
    { key: "general", label: "Général", content: <div>...</div> },
    { key: "contrat", label: "Contrat", content: <div>...</div> },
  ]}
  defaultTab="general" // optionnel, défaut: tabs[0]
/>
```

Utilisé par `apps/hr` : fiche employé (`EmployeeDetailView`, voir `docs/apps/hr/HR.md`).

### `GraphQLSelect` (`src/GraphQLSelect.tsx`)

Select avec recherche intégrée pour choisir une valeur dans un modèle enregistré auprès
du gateway GraphQL — alternative à un `<select>` natif quand la table peut contenir
beaucoup de lignes (charger toutes les options d'un coup devient ingérable). Basé sur
`useGraphQLRecords` (recherche debouncée 300ms, `app`/`model`/`searchFields`) — pas de
nouveau mécanisme de fetch, juste une UI combobox par-dessus.

```tsx
<GraphQLSelect<GroupRecord>
  app="hr"
  model="groups"
  searchFields={["name"]}
  include={["parent"]}      // relations à embarquer, voir useGraphQLRecords ci-dessus
  depth={3}
  value={groupId}
  onChange={(id, record) => setGroupId(id as number | null)}
  getOptionLabel={(group) => group.name}   // l'appelant décide du rendu, comme DataList.columns[].render
  placeholder="Rechercher un groupe…"
/>
```

- `getOptionLabel` est **toujours** fourni par l'appelant — le composant ne sait rien de
  la forme métier d'un modèle. `getOptionValue` (défaut : `record.id`) si la clé n'est
  pas `id`.
- Combobox minimal : input = affichage de la sélection courante + champ de recherche
  (vidé au focus), liste déroulante en dessous, navigation clavier
  (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), fermeture sur clic extérieur (`onBlur` +
  `preventDefault` sur le `onMouseDown` des options pour que le clic s'enregistre avant
  la fermeture). Pas de dépendance externe.
- Composant contrôlé (`value`/`onChange`) ; si `value` redevient `null` depuis le parent,
  le label affiché se réinitialise.
- `pageSize` (défaut `20`) borne la liste déroulante — ce n'est pas une pagination, juste
  le nombre de résultats chargés pour la recherche en cours.
- `initialLabel` (optionnel) : affiché tant qu'aucune sélection n'a été faite dans ce
  composant alors que `value` est déjà non nul — cas d'un formulaire d'édition où seul
  le nom de la valeur existante est connu côté appelant (ex: `GroupDetail.manager.
  first_name/last_name` en hr, sans le record `employees` complet attendu par
  `getOptionLabel`). Sans ça, le champ apparaîtrait vide au chargement malgré une valeur
  déjà assignée. Voir `CreateEmployeeDrawer`/`GroupFormDrawer` dans `apps/hr`.

Utilisé par `apps/hr` : sélecteur de groupe dans `CreateEmployeeDrawer` (voir
`docs/apps/hr/HR.md`) — le chemin hiérarchique affiché (`"Employee / Ingénierie /
Backend"`) est reconstruit côté client en remontant la relation `parent` embarquée
(`include`/`depth`, voir `backends/docs/services/graphql/GRAPHQL.md#relations`).

### `DropdownMenu` (`src/DropdownMenu.tsx`)

Menu déroulant générique pour regrouper plusieurs actions derrière un seul bouton —
évite d'empiler des boutons côte à côte quand une vue accumule des actions au fil du
temps (cas typique : une fiche détail avec de plus en plus d'actions secondaires).

```tsx
<DropdownMenu
  label="Options"
  icon={<MoreHorizOutlined style={{ fontSize: 18 }} />}
  items={[
    { key: "members", label: `Membres (${count})`, icon: <PeopleOutlined />, onClick: ... },
    { key: "edit", label: "Modifier le groupe", icon: <EditOutlined />, onClick: ... },
    { key: "delete", label: "Supprimer", icon: <DeleteOutlined />, onClick: ..., danger: true },
  ]}
/>
```

- `items` construit dynamiquement par l'appelant (ex: items gardés par
  `usePermissions().can(...)` mélangés via spread conditionnel) — le composant ne sait
  rien des permissions ou de la logique métier, juste une liste `{key, label, icon?,
  onClick, danger?}`.
- `danger` colore l'entrée en `text-error` (actions destructives).
- Fermeture au clic extérieur ou `Escape`, même convention que `Modal`/`RightDrawer`.
- Pas de `trigger` personnalisable — le bouton déclencheur est toujours rendu par le
  composant lui-même (`label` + `icon?` + chevron `ExpandMoreOutlined`), pour rester
  simple ; à généraliser si un futur usage a besoin d'un déclencheur sur-mesure.

Utilisé par `apps/hr` : menu "Options" de `GroupFolderView` (Membres, Modifier le
groupe, Nouveau sous-groupe — voir `docs/apps/hr/HR.md`).

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

### `Accordion` (`src/Accordion.tsx`)

Accordéon générique unitaire : header cliquable (titre + badge optionnel) avec
`ExpandMoreOutlined` qui tourne à l'ouverture, contenu collapsible. Non contrôlé
(`defaultOpen`) — pour forcer l'ouverture depuis le parent (ex. pendant une recherche),
remonter le composant via `key`. Contrairement à `PermissionPicker`, ne gère pas
lui-même un groupe de plusieurs sections ni de recherche — un seul accordéon, le parent
orchestre la liste et le filtrage (voir `frontends/docs/apps/workspace/WORKSPACE.md#paramètres`
pour un exemple : sections de paramètres groupées par app).

```tsx
<Accordion title="Affichage" badge={`(${settings.length})`} defaultOpen={isSearching}>
  {settings.map((s) => <SettingRow key={s.id} setting={s} />)}
</Accordion>
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

Utilisé par `apps/hr` dans le navigateur de dossiers (`GroupFolderView`), pour les
sous-groupes et les employés directs d'un groupe (voir `docs/apps/hr/HR.md`) — filtrage
et pagination 100% client (les données sont déjà toutes chargées par
`GET /hr/groups/{id}`).

**Mode serveur** (`serverMode`) — props additionnelles, toutes optionnelles et
rétro-compatibles :

```ts
serverMode?: boolean;          // true => `items` est déjà la page courante, pas de filtre/slice local
totalCount?: number;           // total réel (recherche/pagination côté serveur)
loading?: boolean;             // affiche "Chargement…" à la place de emptyMessage
onSearchChange?: (query: string) => void;  // appelé au lieu du filtre local
onPageChange?: (page: number) => void;     // appelé au lieu du setPage local
bare?: boolean;                // retire bordure/coins arrondis/fond — pour un conteneur
                                // qui a déjà sa propre bordure (ex: RightDrawer)
```

En mode serveur, `DataList` garde la propriété de son état UI (texte de recherche, page
courante affichée, boutons précédent/suivant) mais ne filtre/tronçonne plus `items`
localement — il notifie le parent via les callbacks. Voir `useGraphQLRecords` ci-dessous
pour le cas d'usage prévu (les deux sont conçus pour fonctionner ensemble, mais
`DataList` n'a aucune dépendance dure à ce hook — n'importe quelle source de données
externe paginée peut l'alimenter en mode serveur).

### `useGraphQLRecords` (`src/hooks/useGraphQLRecords.tsx`)

Hook découplé de tout rendu — centralise le fetch vers le gateway GraphQL générique
(`POST /api/graphql`, convention same-origin que doit exposer chaque app consommatrice,
voir `docs/apps/hr/HR.md` et `backends/docs/services/graphql/GRAPHQL.md`) : recherche
debouncée (300ms par défaut), pagination `limit`/`offset`, état `loading`/`error`,
`refetch()` manuel (utile après une mutation faite ailleurs, ex: REST). N'importe quel
composant peut le consommer — `DataList` en mode serveur et `GraphQLSelect` (voir
ci-dessous) ne sont que deux choix de rendu parmi d'autres (grille de cartes, kanban...).
`include`/`depth` (optionnels) embarquent des relations — voir
`backends/docs/services/graphql/GRAPHQL.md#relations`.

```tsx
const { items, total, loading, error, setQuery, setPage, refetch } =
  useGraphQLRecords<Employee>({
    app: "hr",
    model: "employees",
    searchFields: ["first_name", "last_name", "email"],
    enabled: canView, // évite un fetch (et un 403 GraphQL) tant que la permission n'est pas confirmée
  });

<DataList
  serverMode
  items={items}
  totalCount={total}
  loading={loading}
  columns={columns}
  getRowKey={(e) => e.id}
  onSearchChange={setQuery}
  onPageChange={setPage}
/>
```

Le hook ne connaît que `app`/`model`/`filter`/`limit`/`offset` — il ne renvoie que ce que
le gateway expose en CRUD générique (pas de jointures). Si l'affichage a besoin d'un
champ dérivé d'une autre table (ex: nom du groupe à partir de `group_id`), le résoudre
côté composant à partir d'un autre appel déjà disponible plutôt que d'attendre que le
gateway le fasse (voir `apps/hr/app/employees/page.tsx`).

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

**Scroll** : la colonne flex qui enveloppe `header`+`main` porte `min-h-0` (en plus de
`flex-1 min-w-0`), et `main` porte `min-h-0` en plus de `overflow-y-auto`. Sans ça, un
flex item garde son `min-height: auto` (taille du contenu) par défaut — `main` ne
rétrécit jamais sous la hauteur de son contenu, donc `overflow-y-auto` ne se déclenche
jamais et le contenu est silencieusement coupé par l'`overflow-hidden` du conteneur
racine dès qu'une page a un contenu plus long que l'écran (ex. un formulaire à
plusieurs sections). Bug découvert via la page `/flows/new` d'`apps/approval-flows`,
fix appliqué une seule fois ici puisqu'il bénéficie à toutes les apps qui utilisent
`AppShell`.

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
