# App ApprovalFlows — Documentation

**Port :** 3006
**Next.js 16, App Router**
**Rôle :** Produit standalone de création/gestion libre de workflows d'approbation
(mode 2 — voir `backends/docs/services/approval_flows/APPROVAL_FLOWS.md`) et console
des tâches d'approbation pour tout workspace. Câblage session/auth/RBAC mirroring
exact du pattern `apps/hr`/`apps/workspace` : `app/layout.tsx` (Server Component)
appelle `getServerSession()`, monte `<SessionProvider>`, gate sur `approval_flows.access`
(sinon `<AccessDenied>` + `WorkspaceSwitcher filterPermission="approval_flows.access"`
si un autre workspace y donne accès).

---

## Pages

- **`/flows`** (`app/flows/page.tsx`) — liste (`listFlows()` → `GET /api/approval-flows/flows`
  → `GET /approval-flows/flows`, flows du workspace **+** templates d'app jamais
  configurés dans ce workspace), rendue via `@repo/ui/DataList` (mode local, pas
  `serverMode` — la liste reste petite). Colonnes : Identifiant, Titre, Origine
  (`Template (${app_key})` si issu d'un template, "Créé librement" sinon), Statut
  (`statusLabel()` : "Publié" si `configured`, "Brouillon" si `has_draft` sans version
  publiée, "Non configuré" sinon). Clic sur une ligne → toujours `/flows/{id}/edit`
  (gère aussi bien un flow existant qu'un template pas encore configuré, voir
  `FlowForm.tsx` ci-dessous — plus de page `/flows/[id]/bindings`, supprimée avec le
  binding côté service). Bouton "Créer un flow" gated
  `usePermissions().can("approval_flows.manage")`, navigue vers `/flows/new`.
- **`/flows/new`** et **`/flows/[id]/edit`** — pages de création/édition d'un
  `ApprovalFlow`. Le formulaire (`components/FlowForm.tsx`) est enveloppé dans une
  card blanche (`rounded-xl border border-outline-variant bg-surface-container-lowest
  p-6`). `/flows/[id]/edit` récupère `getFlow(id)` côté client avant de monter le
  formulaire — fonctionne aussi bien pour un flow déjà configuré que pour un template
  d'app jamais touché dans ce workspace (`getFlow` renvoie alors `configured: false` +
  contenu `suggested_*`, pas de `404`). `onCancel` renvoie vers `/flows`. `onSaved` est
  rappelé après **chaque** mutation réussie (création, sauvegarde de version,
  publication, nouvelle version) — `/flows/new` s'en sert pour **rediriger** vers
  `/flows/{id}/edit` dès la création initiale (le flow a alors un id réel, l'édition
  suivante doit passer par les endpoints de version) ; `/flows/[id]/edit` s'en sert
  juste pour mettre à jour son state local (`setFlow`), sans navigation — l'admin reste
  sur la page pour publier ensuite.
- **`components/FlowForm.tsx`** — formulaire partagé par les deux pages ci-dessus,
  désormais **version-aware** (voir section dédiée ci-dessous pour le détail du
  versioning). Au-delà de ça :
  Champs du formulaire de soumission en lignes répétables (libellé/description
  optionnelle/type `text_short`|`text_long`|`number`|`date`|`attachment`|
  `single_choice`|`multi_choice`/requis) — **optionnels**, un flow peut n'avoir aucun
  champ. `single_choice`/`multi_choice` affichent un éditeur d'options (texte libre,
  ajout/suppression de lignes) ; au moins une option non vide requise pour ces deux
  types (validation côté `FlowForm`, le service ne valide pas `fields_schema` au-delà
  de sa forme). Ancienne valeur `"text"` (avant le découpage court/long) normalisée
  silencieusement en `text_short` à l'affichage (`normalizeField()`), pas de migration
  de données nécessaire. Étapes séquentielles en lignes répétables (nom, type
  d'approbateur + config conditionnelle, mode d'approbation) — **au moins une étape
  obligatoire**, contrairement aux champs :
  - `step_key` n'est **plus saisi manuellement** — généré via `crypto.randomUUID()` à la
    création de chaque étape (`emptyStep()`), stable ensuite tant que l'étape n'est pas
    supprimée/recréée. Même chose pour la `key` d'un champ (`emptyField()`), purement
    interne (sert de nom de propriété dans `field_values` à la soumission, jamais
    affichée/éditée par l'auteur du flow).
  - `specific_user`/`specific_group` utilisent `@repo/ui/SearchSelect` (recherche
    intégrée) au lieu d'un `<input type="number">` brut — voir section dédiée plus bas.
  - **`approval_mode` n'est un choix utilisateur que pour `specific_group`** — c'est le
    seul `approver_type` qui peut résoudre à plusieurs approbateurs, donc le seul où
    any/all change réellement le comportement (`needsApprovalModeChoice()`). Le
    `<select>` n'est rendu que dans ce cas, avec son premier `<option value=""
    disabled>` non sélectionnable et le même garde-fou `handleSubmit` qu'avant pour
    forcer un choix explicite. Pour `specific_user` et `criteria` (`hierarchical_superior`
    *et* `role_label`), il n'y a jamais plus d'un approbateur résolu (0 ou 1) : le select
    est masqué et `approval_mode` est forcé à `"any"`, à la fois au moment du changement
    de `approver_type` et, par défense en profondeur, ré-appliqué juste avant l'envoi du
    payload (`normalizedSteps` dans `handleSubmit`) — un step `criteria`+`role_label`
    posera donc toujours `"any"` côté service, jamais `"all"`, même via une édition
    directe préexistante. Le service continue de ne jamais poser de défaut lui-même
    (`backends/docs/services/approval_flows/APPROVAL_FLOWS.md`) — c'est le frontend qui
    restreint le choix selon le type, pas le backend.
  - **`criteria` → `role_label`** utilise désormais le même `@repo/ui/SearchSelect` de
    groupes que `specific_group` (au lieu d'un `<input>` de label libre) — stocke
    `{criterion: "role_label", group_id}` au lieu de `{criterion: "role_label",
    label}`. Un "rôle" est donc un groupe `auth` du workspace courant, résolu
    directement sans binding (cf. suppression de `ApprovalFlowWorkspaceBinding` côté
    service).
  - **Réorganisation par drag-and-drop** — chaque bloc d'étape *et* chaque bloc de champ
    est `draggable` (HTML5 DnD natif, pas de nouvelle dépendance ajoutée au monorepo
    pour ça : les listes restent toujours courtes), avec deux états de drag séparés
    (`draggedIndex` pour `steps`, `draggedFieldIndex` pour `fields`) puisque les deux
    listes peuvent être réordonnées indépendamment. `onDragStart` mémorise l'index
    source, `onDrop` appelle `moveStep(from, to)`/`moveField(from, to)` qui réordonnent
    le state local par `splice` immutable — l'ordre envoyé au service reste dérivé de la
    position dans le tableau (`enumerate(payload.steps)` côté `create_flow`/
    `update_flow`, inchangé), donc aucun changement backend n'était nécessaire pour
    cette partie. Poignée visuelle `DragIndicatorOutlined` + `key={step.step_key}`/
    `key={field.key}` (pas l'index) pour que React réconcilie correctement les inputs
    contrôlés pendant le déplacement.
  - **Accessibilité (`visible_group_ids`)** — section "Accessibilité" en bas du
    formulaire : `Checkbox` "Visible par tout le workspace" (coché par défaut, reflète
    `visible_group_ids = []`) ; décoché, affiche `@repo/ui/MultiSelect` peuplé via
    `listGroups(workspaceId)` (déjà utilisé pour `specific_group`) pour choisir les
    groupes `auth` autorisés à voir/soumettre ce flow. `handleSubmit` bloque l'envoi si
    la case est décochée sans aucun groupe sélectionné (sinon le flow deviendrait
    invisible pour tout le monde y compris ses créateurs). Le payload envoie toujours
    `visible_group_ids: []` quand la case est cochée, peu importe l'état résiduel du
    `MultiSelect` — voir `backends/docs/services/approval_flows/APPROVAL_FLOWS.md` pour
    l'enforcement côté service (`_is_visible`).
  - **Destination (`destination_user_ids`/`destination_group_ids`)** — section
    "Destination", juste après "Accessibilité", même style. Deux `MultiSelect`
    séparés (pas un sélecteur combiné — même choix que pour la visibilité de champ :
    "deux listes différentes pour être plus simple pour l'utilisateur") : un sur
    `allMembers` (`{id: m.user.id, label: memberLabel(m)}`), un sur `allGroups`. Pas
    de validation bloquante (vide = personne désigné, état valide, contrairement à
    `visible_group_ids` qui rendrait le flow invisible). Envoyés dans le même
    `updateFlow`/`createFlow` que `visible_group_ids` (un seul submit pour toute la
    section accessibilité+destination). **Aucune vue ne consomme encore ces deux
    listes** — `apps/approval-flows` les persiste seulement ; la future page
    "Submission" (placeholder "Bientôt disponible", voir plus bas) les lira pour
    déterminer qui peut y voir une demande `approved`.
  - **Bug corrigé en même temps** (`handleSubmit`, branche "flow existant") : après
    `updateFlow(...)`, son résultat n'était **pas** capturé — `saved` repartait de
    l'ancien `flow!` (spread), donc `visible_group_ids`/`destination_*` retombaient
    visuellement à leur valeur d'avant le save dès que `draft?.id` changeait (premier
    brouillon créé depuis l'onglet "Version publiée", ou tout juste après création
    d'un flow) — pas un bug de persistance serveur, juste un re-sync client avec des
    données obsolètes. Désormais `saved` part de `updatedFlow` (réponse de
    `updateFlow`), pas de `flow!`.

### Versioning (Draft/Published/Archived) dans `FlowForm.tsx`

Le contenu (titre/description/champs/étapes) est désormais porté par
`ApprovalFlowVersion`, pas `ApprovalFlow` directement — voir
`backends/docs/services/approval_flows/APPROVAL_FLOWS.md` pour le modèle complet.
`FlowForm` dérive son mode d'affichage depuis le `FlowDetail` reçu :

- **`flow.workspace_id === null`** (pas de `flow` du tout, ou template d'app jamais
  configuré dans ce workspace) → pas de version publiée à montrer, donc pas d'onglets :
  formulaire de création directe, préremplit depuis
  `flow.suggested_title/description/fields_schema/steps` s'ils existent, affiche un
  champ "Identifiant" libre seulement si `!flow` (un template a déjà un slug connu,
  non éditable). `handleSubmit` appelle `createFlow({id, ...})`, qui crée la ligne
  `ApprovalFlow` **et** sa version `draft` n°1 en une seule requête côté service.
- **`flow.published_version` existant** → deux onglets en tête du formulaire,
  « Version publiée » et « Brouillon » :
  - **Version publiée** — rendu en lecture seule (titre, description, liste des
    champs, liste des étapes avec un résumé de l'approbateur via `approverSummary()`),
    jamais d'`<input>`. Affiché par défaut si aucun brouillon n'existe.
  - **Brouillon** — formulaire éditable complet, préremplit depuis
    `flow.draft_version` s'il existe, sinon depuis `flow.published_version`
    (point de départ d'un futur brouillon — pas encore créé tant que rien n'est
    enregistré). Affiché par défaut si un brouillon existe déjà. `handleSubmit`
    appelle `updateVersion(flow.id, draft.id, content)` si `flow.draft_version`
    existe, sinon `createVersion(flow.id, content)` (création à la volée du premier
    brouillon depuis ce même onglet — pas de bouton séparé "Créer une nouvelle
    version"). Bouton "Publier" (`publishVersion`) visible uniquement si un brouillon
    existe.
  - La version publiée n'est donc **jamais éditée en place depuis l'UI**, même si elle
    n'a encore aucune soumission (le service l'autoriserait via `PATCH .../versions/
    {id}`, mais le frontend ne l'utilise plus que sur un brouillon) — pour modifier,
    on passe systématiquement par l'onglet Brouillon, qui crée la nouvelle version au
    premier `handleSubmit` si besoin.

Badge de statut (Brouillon/Publié/Non configuré) affiché en tête du formulaire dès que
`flow` existe. L'onglet actif et le buffer local (titre/champs/étapes) ne se
resynchronisent que lorsque `flow?.id`, l'id du brouillon ou l'id de la version
publiée changent (`useEffect` dédié) — pas à chaque re-render du parent, pour ne pas
écraser une saisie en cours après un `setFlow` motivé par autre chose ; après une
publication réussie, bascule explicitement sur l'onglet "Version publiée"
(`setActiveTab("published")`), après un enregistrement de brouillon, sur "Brouillon".
`onSaved` est invoqué après chaque mutation réussie (création, sauvegarde,
publication) avec le `FlowDetail` à jour ; c'est la page appelante qui décide de
naviguer ou non (voir section Pages ci-dessus).

- **`/`** (`app/page.tsx`, "MyRequest") — accueil de l'app : tableau (`@repo/ui/DataList`
  en `serverMode`) des demandes soumises par l'utilisateur courant, colonnes Date
  soumission/Titre form/Statut (`Badge` coloré via `STATUS_LABEL`/`STATUS_COLOR`), tri
  `created_at desc` (toujours géré côté service, pas de contrôle de tri en UI). La
  recherche libre reste intégrée à `DataList` (`q`, debounce 300ms côté page, même
  pattern que `apps/workspace/.../members/page.tsx`) ; les filtres structurés (date
  exacte, statuts, type de formulaire) sont dans un `@repo/ui/RightDrawer` ouvert via un
  bouton "Filtres" (badge = nombre de filtres actifs) — pas affichés inline, pour garder
  l'en-tête de page compact. Les contrôles du drawer (`<input type="date">`,
  `MultiSelect` statuts `pending`/`needs_update`/`approved`/`rejected`, `<select>` type
  de formulaire alimenté par `listFlows()`) s'appliquent en direct (chaque `onChange`
  déclenche le refetch via `listMyRequests()`, `app/lib/api.ts` — pas de bouton
  "Appliquer" séparé) ; le drawer n'est qu'un conteneur, fermé via son bouton "Fermer"
  ou sa croix. Pagination 100% côté serveur (`PAGE_SIZE = 20`, `offset`/`limit`). Clic
  sur une ligne → `/my-requests/{id}`. Bouton "Nouveau" (`components/NewRequestModal.tsx`)
  ouvre une modale centrée (même habillage visuel que la `SearchModal` du `⌘K` de
  `@repo/ui/shell/TopBar` — fond `black/40` flouté, carte `rounded-2xl`, input de
  recherche en en-tête) listant les flows **`configured` ET `app_key === null`**
  (réutilise les `flows` déjà chargés pour le filtre type de formulaire, pas de requête
  dédiée) : les 5 premiers par défaut, filtrés par titre dès qu'une recherche est tapée
  (pas de troncature à 5 dans ce cas). Clic sur un flow → `/submit/{flowId}`.
  **`app_key !== null` = template d'app (mode 1, ex. `hr.leave_request`) — exclu
  délibérément** : ces flows ne se soumettent que depuis le composant métier de l'app qui
  les embarque (`ApprovalFlowWrapper` câblé en dur sur son `flowId`, ex. `hr`), jamais en
  libre-service générique ici ; seuls les flows créés librement dans ce workspace
  (mode 2, `app_key` null) sont éligibles à ce raccourci.
- **`/submit/[id]`** (nouveau) — page de soumission libre-service : `getFlow(id)` d'abord
  pour vérifier `app_key` — si non `null`, affiche un message ("Ce formulaire appartient
  à l'application « {app_key} » — il se soumet depuis cette application, pas en
  libre-service ici.") au lieu du formulaire, **garde-fou redondant avec le filtre de la
  modale** pour le cas d'une navigation directe vers l'URL. Sinon, enveloppe
  `<ApprovalFlowWrapper flowId={id} />` (`@repo/approval-flows`, `basePath` par défaut
  `/api/approval-flows`, déjà le bon proxy BFF de cette app) dans une card, `onSubmitted`
  redirige vers `/my-requests/{request.id}`. C'est la première utilisation de
  `ApprovalFlowWrapper` **dans cette app elle-même** (jusqu'ici réservé à l'intégration
  mode 1 d'autres apps, ex. `hr`) — logique car `apps/approval-flows` est aussi le
  produit où un membre du workspace soumet librement une demande **créée dans ce
  workspace**, pas seulement où un admin construit des flows.
- **`/my-requests/[id]`** (nouveau) — détail d'une demande soumise (`getRequest(id)`) :
  en-tête (titre du flow, badge statut), section "Champs soumis" dans une card
  (`rounded-xl border bg-surface-container-lowest`, même habillage que les autres cards
  de l'app) — clé technique (uuid pour un flow créé après l'introduction de
  `crypto.randomUUID()` côté `FlowForm`) résolue en **libellé** via `fieldLabel(request.
  fields, key)` (helper local, `RequestDetail.fields: {key, label, type}[]`, jamais
  l'inverse), valeur `{"__restricted__": true}` affichée "🔒 Information restreinte"
  (cohérent avec le masquage de champ côté service). Un champ `fieldType(request.
  fields, key) === "attachment"` non restreint est rendu comme un lien `<a href="/api/
  approval-flows/requests/{id}/attachments/{document_id}">Télécharger la pièce
  jointe</a>` (navigation directe, pas de fetch JS — le navigateur envoie le cookie de
  session automatiquement) plutôt que la valeur brute (le `document_id`, un entier
  sans signification pour l'utilisateur). Timeline "Historique et avancement" construite en
  croisant `RequestDetail.steps` (`step_key`/`name`/`order`) et `.decisions` — pour
  chaque step, la **dernière** décision de son `step_order` détermine l'icône (✅ si
  `approve`, ❌ si `reject`, ⏳ si c'est l'étape courante d'une demande `pending`, ○
  sinon) ; **toutes** les décisions historiques du step sont listées (important pour un
  step rejeté "soft" — voir `backends/docs/services/approval_flows/
  APPROVAL_FLOWS.md#rejet` — puis re-décidé après resoumission : on voit le rejet **et**
  l'approbation qui a suivi), chacune affichant `decision.decided_by_name ?? "l'utilisateur
  #${decided_by}"` (fallback id si la résolution backend échoue) — jamais l'id brut en
  premier choix.
- **`/requests`** (renommé depuis `/tasks`) — wrapper mince autour de
  `<ApprovalTaskList mode="tasks" />` (`@repo/approval-flows`) dans `DashboardShell`.
  `GET /requests?approver=true` (mes décisions en attente, boutons Approuver/Rejeter
  visibles uniquement pour les requêtes `pending`). Comportement inchangé, seulement
  déplacé/renommé pour matcher le nouveau menu.
- **`/submissions`** — n'utilise plus `ApprovalTaskList` (cette vue "mes soumissions" a
  migré sur l'accueil `/`, voir ci-dessus). Devient un placeholder "Bientôt disponible"
  pour le futur écran des formulaires intégralement approuvés (nav "Submission") —
  destiné à lire `destination_user_ids`/`destination_group_ids` du flow (section
  "Champs du formulaire de soumission" ci-dessus) pour décider qui y voit quoi, une
  fois construit.

### Recherche intégrée utilisateur/groupe (`specific_user`/`specific_group`)

`FlowForm.tsx` résout ces deux approbateurs directement contre le service `auth` (pas
le gateway GraphQL — `auth` n'y est pas enregistré, et la liste des membres nécessite
une jointure `User`+`WorkspaceMembership` que le gateway générique ne fait pas) :

- BFF `app/api/workspaces/[workspaceId]/members/route.ts` et
  `app/api/workspaces/[workspaceId]/groups/route.ts` (`forwardToBackend` vers
  `AUTH_API_URL`, déjà présent dans le `.env` de cette app) → respectivement
  `GET /auth/workspaces/{id}/members?q=&limit=&offset=` (recherche+pagination déjà
  supportées côté `auth`, gated `members.view`) et `GET /auth/workspaces/{id}/groups`
  (pas de paramètre de recherche côté `auth` — filtrage fait côté client dans
  `FlowForm.tsx`, les listes de groupes restant petites).
- `app/lib/api.ts` : `searchMembers(workspaceId, q)` / `listGroups(workspaceId)`.
- `workspaceId` lu depuis `useSessionStore((s) => s.activeWorkspace)` (workspace actif
  de la session courante, pas un paramètre d'URL).
- Composant `@repo/ui/SearchSelect` (nouveau, `packages/ui/src/SearchSelect.tsx` +
  `packages/ui/src/hooks/useSearchOptions.tsx`) : même UX que `@repo/ui/GraphQLSelect`
  (champ texte + icône recherche, dropdown débouncé 300ms, navigation clavier
  Échap/↑/↓/Entrée) mais générique sur un `fetchOptions(query) => Promise<T[]>` fourni
  par l'appelant au lieu d'être câblé sur le gateway GraphQL — réutilisable par
  n'importe quelle app pour une recherche adossée à une API REST quelconque.
  `getOptionValue` est explicite pour les membres (`member.user.id`, pas
  `member.id` — c'est l'id `User` qui est stocké dans `approver_config.user_id`, pas
  l'id de la `WorkspaceMembership`).
- En édition, si `approver_config.user_id`/`group_id` est déjà renseigné, le champ
  affiche `Utilisateur #{id}`/`Groupe #{id}` (`initialLabel`) tant qu'aucune nouvelle
  recherche n'a été faite — `auth` n'expose pas de lookup par id seul pour ce champ,
  resélectionner via la recherche est nécessaire pour afficher le libellé réel.

---

## Package partagé `@repo/approval-flows`

Mirroring `@repo/auth` — vraie logique (état, appels API), pas juste de l'UI :

```
packages/approval-flows/src/
  types/flow.ts, types/request.ts   → types partagés (FlowDetail, FlowSummary, VersionDetail, VersionSummary, RequestDetail, RequestSummary, RequestStepInfo, RequestFieldInfo, RequestListResponse, AttachmentOut...)
  api/client.ts                      → getFlow, submitRequest, listTasks, listSubmissions, getRequest, decideRequest, uploadAttachment
  hooks/useApprovalFlow.ts           → fetch d'un flow par id
  hooks/useApprovalTasks.ts          → fetch "mes tâches" / "mes soumissions" + refetch
  components/ApprovalFlowWrapper.tsx → formulaire de soumission généré depuis fields_schema
  components/ApprovalTaskList.tsx    → liste de tâches avec actions Approuver/Rejeter, exporte aussi `STATUS_LABEL` (réutilisé par l'accueil "MyRequest" de `apps/approval-flows`)
```

`RequestSummary`/`RequestDetail` incluent désormais `flow_title` (titre de la version
épinglée). `GET /requests` (donc `listTasks`/`listSubmissions`) renvoie côté service une
enveloppe `{requests, total}` (voir doc backend) — déballée dans `api/client.ts`, la
signature de retour de ces deux fonctions reste `RequestSummary[]` pour leurs appelants
existants (`useApprovalTasks`, inchangé).

**`basePath` configurable** (toutes les fonctions de `api/client.ts`, défaut
`"/api/approval-flows"`) — chaque app consommatrice (`apps/approval-flows`,
`apps/hr`, potentiellement `apps/workspace` plus tard) garde son **propre** proxy BFF
(`@repo/network` côté serveur termine toujours le chiffrement chez l'app qui
consomme), pas de raccourci cross-app vers le BFF d'une autre app. `package.json`
expose `exports` explicites par fichier (`./types/flow`, `./ApprovalFlowWrapper`...),
même pattern que `@repo/auth`/`@repo/ui` — résolution runtime (`default`) vers
`./dist/*.js`, résolution TypeScript (`types`) vers la source `.ts`/`.tsx` directement.

> **Piège connu** : le runtime (bundler Next.js/Turbopack) résout uniquement via la
> condition `default` → `dist/`. `npx tsc --noEmit` (type-check seul) ne génère jamais
> ce dossier et passe sans erreur même si `dist/` est totalement absent, puisque
> TypeScript résout via la condition `types` directement sur la source. Avant toute
> vérification "ça marche", lancer `npm run build` (pas seulement `tsc --noEmit`) dans
> `packages/approval-flows` après tout changement, et redémarrer le serveur `next dev`
> des apps consommatrices (un process déjà lancé ne reprend pas un nouveau symlink
> `node_modules/@repo/approval-flows` ni un `dist/` regénéré sans redémarrage).

### `ApprovalFlowWrapper`

`{ flowId, basePath?, externalRef?, callbackUrl?, onSubmitted? }` — `useApprovalFlow(flowId, basePath)`
charge le `FlowDetail`. Si `!flow.configured || !flow.published_version` (template
jamais configuré dans ce workspace, ou flow existant sans version publiée), affiche
"L'admin doit configurer l'approval flow." au lieu du formulaire — c'est le cas tant
qu'aucun admin n'a publié au moins une version. Sinon, rend un input par champ de
`flow.published_version.fields_schema` — `text_short`/`number`/`date` → `<input>`,
`text_long` → `<textarea>`, `single_choice` → `<select>` (`field.options`),
`multi_choice` → une checkbox par option (valeur soumise = `string[]`). Soumet via
`submitRequest({ flow_id, field_values, external_ref, callback_url }, basePath)` —
`field_values[key]` est casté en `number` pour `number`, en `string[]` pour
`multi_choice`, en `string` sinon. Affiche un message de confirmation avec le
statut initial (`"pending"`) après soumission réussie. C'est le composant qu'embarque
l'intégration mode 1 de `hr` (`/demo-approval`, voir `frontends/docs/apps/hr/HR.md`) en
ne passant que `flowId="hr.leave_request"`.

**`attachment`** — `<input type="file">`, upload **immédiat** au choix du fichier
(pas au submit final) via `uploadAttachment(file, basePath)` (`api/client.ts`,
multipart, **bypass `apiFetch`/`@repo/network`** — body `FormData` direct via
`fetch`, même exception que les routes OAuth et l'upload `hr`, voir
`backends/docs/services/documents/DOCUMENTS.md`) → `POST {basePath}/requests/
attachments`. Le `document_id` renvoyé est stocké dans `values[field.key]` (`string`,
casté en `number` au submit, comme un champ `number` classique) ; état local
`attachments: Record<string, {uploading, filename, error}>` affiche "Envoi en
cours…"/le nom du fichier/une erreur sous l'input. Bouton "Soumettre" désactivé tant
qu'un upload est en cours. Un champ `attachment` `required` sans `document_id`
bloque la soumission côté client avec un message dédié (validation manuelle — un
`<input type="file" required>` ne suffit pas puisque la valeur réelle est le
`document_id`, pas le fichier lui-même). **Chaque app consommatrice doit exposer son
propre proxy `POST {basePath}/requests/attachments` et `GET {basePath}/requests/{id}/
attachments/{document_id}`** pour que cette fonctionnalité marche chez elle — voir
"Routes BFF" ci-dessous ; à ce jour seule `apps/approval-flows` les expose (`hr`
n'a pas encore de champ `attachment` dans `hr.leave_request`).

### `ApprovalTaskList`

`{ mode = "tasks", basePath }` — `useApprovalTasks(mode, basePath)` charge la liste,
boutons Approuver/Rejeter visibles uniquement si `mode === "tasks" && item.status ===
"pending"`, appellent `decideRequest(requestId, { decision }, basePath)` puis
`refetch()`.

---

## Routes BFF (`app/api/approval-flows/...`)

Miroir 1-pour-1 des routes du service `approval_flows` (port 5005), toutes via
`forwardToBackend(request, APPROVAL_FLOWS_API_URL, "/approval-flows/...")` :

- `flows/route.ts` (GET liste, POST création)
- `flows/[id]/route.ts` (GET détail, PATCH édition de `visible_group_ids`)
- `flows/[id]/versions/route.ts` (GET liste, POST nouvelle version)
- `flows/[id]/versions/[versionId]/route.ts` (GET détail, PATCH édition, DELETE
  brouillon)
- `flows/[id]/versions/[versionId]/publish/route.ts` (POST publication)
- `requests/route.ts` (GET liste — `mine`/`approver`/`q`/`status`/`flow_id`/`date`/
  `limit`/`offset` en query string, transmise automatiquement par `forwardToBackend`,
  pas de code dédié nécessaire —, POST soumission). Consommé directement par
  `app/lib/api.ts::listMyRequests()` (accueil "MyRequest") en plus de
  `listTasks`/`listSubmissions` (`@repo/approval-flows`).
- `requests/[id]/route.ts` (GET détail — consommé par `app/lib/api.ts::getRequest()`
  pour `/my-requests/[id]`)
- `requests/[id]/decide/route.ts` (POST décision)
- `requests/attachments/route.ts` (POST upload — **pas** `forwardToBackend`/
  `@repo/network`, body multipart pass-through brut vers
  `APPROVAL_FLOWS_API_URL`, cookie forwardé manuellement, même pattern que
  `apps/hr/app/api/employees/[id]/documents/route.ts`)
- `requests/[id]/attachments/[documentId]/route.ts` (GET téléchargement — réponse
  binaire pass-through brute, même pattern que `apps/hr/.../documents/[documentId]/
  content/route.ts` ; consommé par un simple `<a href>` dans `/my-requests/[id]`,
  pas par `app/lib/api.ts` — navigation directe du navigateur, pas de fetch JS)

> Pas encore de proxy pour `POST /requests/{id}/resubmit` (service backend prêt, voir
> `backends/docs/services/approval_flows/APPROVAL_FLOWS.md`) — aucune UI de
> resoumission n'existe encore dans cette app, hors scope tant qu'elle n'est pas
> demandée.

---

## Variables d'environnement (`.env`)

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|--------------------------|
| `AUTH_API_URL`                     | Server  | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API`             | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN` | Browser | `http://localhost:3001` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`     | Browser | `http://localhost:3005` |
| `APPROVAL_FLOWS_API_URL`           | Server  | `http://127.0.0.1:5005` (backend FastAPI `approval_flows`) |

---

## Notes

- Dépend du service backend `approval_flows` (FastAPI, `backends/approval_flows/`,
  port 5005) — doit tourner pour que toutes les pages répondent. Voir
  `backends/docs/services/approval_flows/APPROVAL_FLOWS.md`.
- Dépend du registre `App`/`Permission` du service `auth` : `approval_flows.access`
  et `approval_flows.manage` doivent exister (enregistrés automatiquement par le
  service `approval_flows` au démarrage via `POST /auth/apps/register`).
- Aucune logique métier propre à une app particulière dans ce produit — il ne connaît
  ni `hr`, ni aucun autre consommateur ; toute intégration mode 1 (template global
  enregistré par une app) reste pilotée depuis l'app appelante, pas depuis ici.
