# App HR — Documentation

**Port :** 3003
**Next.js 16, App Router**
**Rôle :** Module Ressources Humaines du SAAS Workspace — sert aussi de démonstration
minimaliste du registre RBAC multi-application (voir `backends/docs/services/hr/HR.md`).

---

## État actuel

Câblage session/auth/RBAC complet, mirroring exact du pattern `apps/workspace` :

- `app/layout.tsx` (Server Component, `async`) appelle `getServerSession()`, monte
  `<SessionProvider>` puis gate l'accès sur la permission `hr.access` : si absente, rend
  `<AccessDenied appName="RH" workspaceName={...} switcher={...} />` (`@repo/ui`, même
  composant que `workspace`) **à l'intérieur** du provider plutôt qu'à sa place. Le
  `switcher` (`<WorkspaceSwitcher filterPermission="hr.access" />`) n'est passé que si
  l'utilisateur a `hr.access` dans au moins un autre de ses workspaces.
- `proxy.ts` (middleware racine) redirige vers l'app `auth` si pas de cookie
  `access_token` — copie exacte de `apps/workspace/proxy.ts`.
- `app/api/auth/session/route.ts` — proxy cookie → `auth` (filet de sécurité client,
  même pattern que `workspace`).
- `app/api/departments/route.ts` — proxy cookie → le service backend `hr` (FastAPI,
  port 5001, `GET /hr/departments`).
- `app/api/switch-workspace/route.ts` — proxy cookie → `auth` (`POST /auth/switch-workspace`),
  requis par `WorkspaceSwitcher` (appelle `useSessionStore().switchWorkspace`, qui passe
  toujours par un proxy same-origin de l'app courante, jamais `AUTH_API` directement).
- `app/api/logout/route.ts` — identique à `workspace`.
- `components/DashboardShell.tsx` — shell minimal (`AppShell`/`Sidebar`/`TopBar` de
  `@repo/ui`). Nav : "Accueil" (lien **absolu** vers `NEXT_PUBLIC_WORKSPACE_DOMAIN` —
  doit toujours renvoyer vers l'app `workspace`, quelle que soit l'app courante),
  "Employés" (`/employees`), "Groupes/Départements" (`/groups`).
  `topSlot={<WorkspaceSwitcher filterPermission="hr.access" />}` rend le
  switcher de workspace visible dans la sidebar comme dans `workspace` (filtré sur
  `hr.access` pour éviter de basculer vers un workspace où l'utilisateur n'a pas accès à
  RH). Le sélecteur d'app (`TopBar`) filtre la liste avec
  `usePermissions().can(\`${app.id}.access\`)`, même logique que `workspace`.
- `app/page.tsx` — Client Component : si `can("hr.departments.view")`, fetch
  `/api/departments` et affiche la liste mock ; sinon "Accès restreint à cette section".
  Page historique non reliée à la sidebar (mock statique côté backend, `GET
  /hr/departments`) — distincte du module groupes/employés ci-dessous.

### Employés et groupes/départements (navigateur de dossiers)

- **`/employees`** (`app/employees/page.tsx`, Client Component) — si
  `can("hr.employees.view")`, charge la liste via `@repo/ui/hooks/useGraphQLRecords`
  (`app: "hr", model: "employees"`, recherche/pagination **côté serveur** par le gateway
  GraphQL générique — voir `docs/packages/UI.md` et
  `backends/docs/services/graphql/GRAPHQL.md`), rendue dans `@repo/ui/DataList` en mode
  `serverMode`. `enabled: canView` évite le fetch tant que la permission n'est pas
  confirmée. Le gateway renvoie la ligne SQL brute (pas de jointure) — pas de
  `group_name` ; résolu côté client via `listGroupOptions()` (liste plate `{id, path}`,
  `GET /hr/groups`, chargée une fois pour toute la page — distincte du sélecteur de
  création ci-dessous) mappé sur `group_id`. Si `can("hr.employees.manage")`, bouton
  "Nouvel employé" ouvrant `components/CreateEmployeeDrawer.tsx` (`@repo/ui/RightDrawer`
  — prénom, nom, email, fonction/adresse/téléphone optionnels, sélection du groupe via
  `@repo/ui/GraphQLSelect` — voir `docs/packages/UI.md` — au lieu d'un `<select>` chargeant
  tous les groupes : recherche côté serveur, chemin hiérarchique reconstruit via
  `include: ["parent"], depth: 3` — plus de pré-sélection automatique du premier groupe,
  champ vide jusqu'à recherche/choix) — création toujours via `POST /hr/employees` (REST,
  inchangé, body étendu avec `job_title`/`address`/`phone` optionnels) ; `onCreated`
  appelle `refetch()` du hook plutôt que de muter un state local, puisque le gateway est
  désormais la source de vérité de la liste. Clic sur une ligne (`onRowClick`) →
  `router.push("/employees/{id}")`.
- **`/employees/{id}`** (`app/employees/[id]/page.tsx`, Server Component qui `await
  params` puis rend `EmployeeDetailView`, Client Component) — fiche employé : en-tête
  (nom complet, fonction, département, email — `"—"` si `null`) via `getEmployee(id)`
  → `GET /api/employees/{id}` → `GET /hr/employees/{id}` (REST, pas GraphQL — réutilise
  `_to_out` côté backend, donc `group_name` déjà résolu, pas besoin de `include`/
  relations ici). En dessous, `@repo/ui/Tabs` : onglet **Général** (adresse, téléphone)
  et onglet **Contrat** (placeholder statique, à enrichir plus tard — sert pour l'instant
  à valider le mécanisme d'onglets). Accessible depuis `/employees` et depuis le drawer
  employés d'un groupe (voir ci-dessous) — les deux `DataList` pointent vers la même URL.
- **`/groups`** (racine) et **`/groups/[id]`** — toutes deux montent
  `components/GroupFolderView.tsx` (Client Component), respectivement sans `groupId`
  (fetch `getRootGroup()` → `GET /api/groups/root`) et avec (`getGroup(id)` → `GET
  /api/groups/{id}`). Affiche le fil d'ariane (`ancestors` + groupe courant, liens vers
  `/groups` pour la racine ou `/groups/{id}` pour un ancêtre), puis un seul
  `@repo/ui/DataList` pour les sous-groupes directs (ligne cliquable →
  `router.push("/groups/{id}")`, pas de `Link` car `DataList` pilote la navigation via
  `onRowClick`). Chaque ligne affiche, à droite du nom, le nombre total de sous-groupes
  et d'employés **récursif** (`subgroup_count`/`employee_count` de `GroupSummary`, voir
  `backends/docs/services/hr/HR.md`) avec de petites icônes (`FolderOutlined`,
  `PersonOutlined`, 14px). Les employés rattachés **directement** à ce groupe (pas ceux
  des sous-groupes) ne sont plus affichés en permanence : un bouton icône
  (`PeopleOutlined`, à gauche de "Nouveau sous-groupe") ouvre un `@repo/ui/RightDrawer`
  contenant ce `DataList` (`maxHeight="h-full"`, `bare` — le drawer gère son propre
  scroll et son padding via `contentClassName=""`, pas de cadre dans le cadre). Clic sur
  une ligne employé → `/employees/{id}` (même fiche que depuis `/employees`). Sous le
  fil d'ariane, le responsable du groupe courant (`group.manager`, voir
  `backends/docs/services/hr/HR.md#groupes-et-employés`) — `"Responsable : {nom}"` ou
  `"aucun"`. Si `can("hr.departments.manage")` : bouton icône crayon (`EditOutlined`)
  ouvrant `components/GroupFormDrawer.tsx` en mode `edit` sur le groupe affiché, et
  bouton "Nouveau sous-groupe" ouvrant le même composant en mode `create` —
  **`@repo/ui/RightDrawer` dans les deux cas**, plus de popup pour cette page (remplace
  l'ancien `CreateSubgroupModal.tsx`, supprimé). Formulaire identique dans les deux
  modes : nom + responsable via `@repo/ui/GraphQLSelect` (`app="hr" model="employees"`,
  `searchFields: ["first_name", "last_name"]`) — même composant que le sélecteur de
  groupe dans `CreateEmployeeDrawer`. En mode édition, le responsable déjà assigné est
  pré-rempli via le nouveau prop `initialLabel` de `GraphQLSelect` (voir
  `docs/packages/UI.md`) puisque seul son nom est connu côté `GroupDetail`, pas le
  record complet attendu par le composant.
- **Routes BFF** (`app/api/groups/route.ts` — GET liste plate + POST création,
  `app/api/groups/root/route.ts`, `app/api/groups/[id]/route.ts` — GET + PATCH
  (nom/responsable),
  `app/api/employees/route.ts` — GET liste + POST création, **uniquement POST utilisée**
  côté frontend désormais, `app/api/employees/[id]/route.ts` — GET, alimente la fiche
  détail) — toutes via `forwardToBackend(request, HR_API_URL,
  "/hr/...")`, même pattern que `app/api/departments/route.ts`. Plus
  `app/api/graphql/route.ts` — `POST` uniquement, `forwardToBackend(request,
  GRAPHQL_API_URL, "/graphql")`, consommée par `useGraphQLRecords` (convention
  same-origin générique, pas spécifique à `hr`).
- **Backend** : voir `backends/docs/services/hr/HR.md#groupes-et-employés` — persistance
  réelle (SQLAlchemy/Alembic), groupe racine `"Employee"` auto-créé par workspace, gated
  par `hr.departments.{view,manage}` et `hr.employees.{view,manage}`.

---

## Variables d'environnement (`.env`)

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|--------------------------|
| `AUTH_API_URL`                     | Server  | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API`             | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN` | Browser | `http://localhost:3001` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`     | Browser | `http://localhost:3005` |
| `HR_API_URL`                       | Server  | `http://127.0.0.1:5001` (backend FastAPI `hr`) |
| `GRAPHQL_API_URL`                  | Server  | `http://127.0.0.1:5002` (gateway GraphQL générique) |

---

## Notes

- Dépend du service backend `hr` (FastAPI, `backends/hr/`, port 5001) — doit tourner pour
  que `/api/departments` réponde. Voir `backends/docs/services/hr/HR.md`.
- Dépend du registre `App`/`Permission` du service `auth` : `hr.access` et
  `hr.departments.view` doivent exister (enregistrés automatiquement par le service `hr`
  au démarrage via `POST /auth/apps/register`).
