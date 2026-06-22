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
  Deux boutons crayon distincts (gated `can("hr.employees.manage")`), chacun ouvrant un
  `@repo/ui/RightDrawer` ciblant uniquement la section qu'il modifie — pas de popup :
  - Sur l'en-tête : `components/EmployeeBasicInfoEditDrawer.tsx` — prénom, nom, email,
    fonction, groupe/département (`@repo/ui/GraphQLSelect`, même sélecteur hiérarchique
    `include: ["parent"], depth: 3` que `CreateEmployeeDrawer`).
  - Dans l'onglet **Général** : `components/EmployeeGeneralEditDrawer.tsx` — adresse,
    téléphone.

  Les deux appellent le même `updateEmployee(id, {...})` → `PATCH /api/employees/{id}`
  → `PATCH /hr/employees/{id}`, chacun n'envoyant que son propre sous-ensemble de
  champs (`exclude_unset` côté backend, voir `backends/docs/services/hr/HR.md`) — sans
  ça, sauvegarder l'un écraserait les champs gérés par l'autre.

  Onglet **Documents** (entre Général et Contrat), gated `can("hr.documents.view")`/
  `can("hr.documents.manage")` : liste les documents de l'employé
  (`listEmployeeDocuments`), bouton "Ajouter un document" ouvrant
  `components/EmployeeDocumentUploadDrawer.tsx` (`@repo/ui/RightDrawer`, catégorie +
  fichier — catégories fermées `contract`/`id_card`/`diploma`/`other`, libellés FR
  côté composant, libres côté backend), téléchargement (`<a href={employeeDocumentContentUrl(...)}
  target="_blank">`) et suppression (confirmation `window.confirm`, pas de composant de
  confirmation dédié dans `@repo/ui` aujourd'hui).

  **Premier upload de fichier binaire du monorepo** — `@repo/network`
  (`apiFetch`/`forwardToBackend`) encode tout en JSON, inadapté à un body
  `multipart/form-data` ou une réponse binaire. Les deux routes concernées
  (`app/api/employees/[id]/documents/route.ts` en `POST`,
  `app/api/employees/[id]/documents/[documentId]/content/route.ts` en `GET`)
  bypassent volontairement le wrapper et forwardent les octets bruts + le cookie de
  session, même exception déjà documentée pour les routes OAuth (voir
  `frontends/AGENTS.md#repo-network`). La route de téléchargement est appelée par
  navigation directe du navigateur (`<a href>`), pas par `fetch` — les cookies sont
  donc déjà présents sur la requête entrante, same-origin.

  Onglet **Contrat**, gated `can("hr.contracts.view")`/`can("hr.contracts.manage")` :
  remplace l'ancien placeholder statique par l'historique des contrats de l'employé
  (`listEmployeeContracts`, triés du plus récent au plus ancien), badge de statut
  (`upcoming`/`active`/`ended`, calculé côté backend — voir
  `backends/docs/services/hr/HR.md`), bouton "Nouveau contrat" et bouton modifier par
  ligne ouvrant `components/ContractFormDrawer.tsx` (`@repo/ui/RightDrawer`, mode
  `create`/`edit` comme `GroupFormDrawer.tsx`) : type de contrat, dates (case "CDI
  sans date de fin" qui désactive le champ date de fin), temps de travail,
  rémunération + devise + périodicité, et un sélecteur de **document déjà uploadé
  pour cet employé** (`listEmployeeDocuments`, pas de nouvel upload dans ce drawer —
  le contrat référence juste l'`id` d'un document existant). Si un document est
  associé, une icône dans la liste pointe vers `employeeDocumentContentUrl(employeeId,
  document_id)`, réutilisée telle quelle.

  Dans l'en-tête, sous les infos de base : ligne "Compte" affichant
  `linked_account_email` si l'employé est lié à un compte plateforme (icône
  `LinkOutlined`), sinon "Non lié à un compte plateforme" (icône `LinkOffOutlined`).
  Gated `canManage` : bouton "Lier à un compte" (si non lié) ouvrant
  `components/AccountLinkDrawer.tsx`, ou "Délier" (si lié, confirmation
  `window.confirm`, `unlinkEmployeeAccount`). Voir
  `backends/docs/services/hr/HR.md#lien-employee--compte-plateforme` pour le contexte
  backend (prérequis posé pour le futur self-service congés).

  `components/AccountLinkDrawer.tsx` — même structure à 2 étapes que
  `frontends/apps/workspace/components/AddMemberModal.tsx` (étape email → étape
  détails, réutilise `@repo/ui/PasswordInput` avec `generatable`), avec une
  différence clé : `AddMemberModal` traite "déjà membre" comme une erreur, ici c'est
  au contraire le cas simple (carte de confirmation directe, pas de mot de passe à
  saisir) — `checkEmployeeAccountLink` renvoie `{exists, already_member, user_id,
  full_name}`, `linkEmployeeAccount({email, password?, full_name?})` laisse le
  backend re-résoudre et choisir la bonne branche côté serveur.

  `formatDate` (dans `EmployeeDetailView.tsx`) découpe la chaîne `"YYYY-MM-DD"`
  manuellement plutôt que `new Date(value).toLocaleDateString(...)` — une date sans
  heure est interprétée en UTC par `Date`, ce qui peut afficher le jour précédent
  dans un fuseau horaire en arrière de UTC (piège classique, pas rencontré ailleurs
  dans `hr` puisque les autres dates affichées — `created_at` — portent une heure).
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
  `PersonOutlined`, 14px). Sous le fil d'ariane, le responsable du groupe courant
  (`group.manager`, voir `backends/docs/services/hr/HR.md#groupes-et-employés`) —
  `"Responsable : {nom}"` ou `"aucun"`.

  Toutes les actions de la vue sont regroupées derrière un seul menu "Options"
  (`@repo/ui/DropdownMenu`, voir `docs/packages/UI.md`) plutôt qu'empilées en boutons
  côte à côte — pensé pour absorber de futures actions sans réencombrer l'en-tête :
  - **Membres (N)** — `N` = `group.employees.length` (employés rattachés
    **directement** à ce groupe, pas ceux des sous-groupes). Ouvre un
    `@repo/ui/RightDrawer` contenant un `DataList` (`maxHeight="h-full"`, `bare` — le
    drawer gère son propre scroll et son padding via `contentClassName=""`, pas de
    cadre dans le cadre). Clic sur une ligne employé → `/employees/{id}` (même fiche
    que depuis `/employees`). Toujours visible (pas de garde `can(...)` — lecture
    seule).
  - **Modifier le groupe** et **Nouveau sous-groupe** — gated
    `can("hr.departments.manage")`, ouvrent `components/GroupFormDrawer.tsx`
    respectivement en mode `edit` (sur le groupe affiché) et `create` —
    **`@repo/ui/RightDrawer` dans les deux cas**, plus de popup pour cette page
    (remplace l'ancien `CreateSubgroupModal.tsx`, supprimé). Formulaire identique dans
    les deux modes : nom + responsable via `@repo/ui/GraphQLSelect` (`app="hr"
    model="employees"`, `searchFields: ["first_name", "last_name"]`) — même composant
    que le sélecteur de groupe dans `CreateEmployeeDrawer`. En mode édition, le
    responsable déjà assigné est pré-rempli via le nouveau prop `initialLabel` de
    `GraphQLSelect` (voir `docs/packages/UI.md`) puisque seul son nom est connu côté
    `GroupDetail`, pas le
  record complet attendu par le composant.
- **Routes BFF** (`app/api/groups/route.ts` — GET liste plate + POST création,
  `app/api/groups/root/route.ts`, `app/api/groups/[id]/route.ts` — GET + PATCH
  (nom/responsable),
  `app/api/employees/route.ts` — GET liste + POST création, **uniquement POST utilisée**
  côté frontend désormais, `app/api/employees/[id]/route.ts` — GET + PATCH
  (adresse/téléphone), alimente la fiche détail) — toutes via `forwardToBackend(request, HR_API_URL,
  "/hr/...")`, même pattern que `app/api/departments/route.ts`.
  `app/api/employees/[id]/documents/route.ts` (GET liste via `forwardToBackend`, POST
  upload en pass-through multipart — voir note ci-dessus),
  `app/api/employees/[id]/documents/[documentId]/route.ts` (DELETE via
  `forwardToBackend`), `app/api/employees/[id]/documents/[documentId]/content/route.ts`
  (GET, pass-through binaire). `app/api/employees/[id]/contracts/route.ts` (GET +
  POST via `forwardToBackend` — pas de fichier impliqué, juste un `document_id`
  entier qui référence un document déjà uploadé), `app/api/employees/[id]/contracts/[contractId]/route.ts`
  (PATCH via `forwardToBackend`). Plus
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
