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
  → `GET /approval-flows/flows`, templates globaux + flows du workspace), rendue via
  `@repo/ui/DataList` (mode local, pas `serverMode` — la liste reste petite). Colonnes :
  Identifiant, Titre, Origine (`Template (${app_key})` si template global, "Créé
  librement" sinon), Statut. Clic sur une ligne : si `flow.app_key` est renseigné →
  `/flows/{id}/bindings` (configurer le binding workspace) ; sinon, pas d'action (pas
  encore câblé en édition dans cette première version). Bouton "Créer un flow" gated
  `usePermissions().can("approval_flows.manage")`, ouvre
  `components/FlowFormDrawer.tsx`.
- **`/flows/[id]/bindings`** (`app/flows/[id]/bindings/page.tsx`) — pour un template
  global uniquement. `params` consommé via `use(params)` (pattern async params Next.js
  16). Récupère `getFlow(id)` + `listBindings(id)` (`Promise.all`), construit un
  brouillon par step (`step_key` → `{approver_type, approver_config}`, pré-rempli avec
  le binding existant ou, sinon, la config native du step). Un bloc par step
  (`approver_type` select + champs conditionnels : `specific_user` → id utilisateur,
  `specific_group` → id groupe, `criteria` → critère `hierarchical_superior`/
  `role_label` + libellé si `role_label`), bouton "Enregistrer" par bloc →
  `setBinding(id, stepKey, draft)` (`PUT /approval-flows/flows/{id}/bindings/{step_key}`).
  Indicateur "· surcharge active" si un binding existe déjà pour ce step.
- **`/tasks`** et **`/submissions`** — wrappers minces autour de
  `<ApprovalTaskList mode="tasks" | "submissions" />` (`@repo/approval-flows`) dans
  `DashboardShell`. `tasks` = `GET /requests?approver=true` (mes décisions en attente,
  boutons Approuver/Rejeter visibles uniquement pour les requêtes `pending`) ;
  `submissions` = `GET /requests?mine=true` (lecture seule).
- **`components/FlowFormDrawer.tsx`** — création/édition d'un `ApprovalFlow` (mode 2).
  Champs du formulaire de soumission en lignes répétables (clé/libellé/type
  text|number|date|attachment/requis). Étapes séquentielles en lignes répétables
  (clé d'étape, nom, type d'approbateur + config conditionnelle, mode d'approbation).
  **`approval_mode` n'a jamais de valeur initiale** (`""`, pas `"any"`/`"all"`) — le
  `<select>` porte un premier `<option value="" disabled>` non sélectionnable, et
  `handleSubmit` bloque l'envoi avec un message d'erreur si une étape n'a pas de mode
  explicite. Ce choix d'implémentation traduit directement la contrainte du service :
  `approval_mode` est toujours choisi par l'auteur du flow, jamais par défaut — voir
  `backends/docs/services/approval_flows/APPROVAL_FLOWS.md`.

---

## Package partagé `@repo/approval-flows`

Mirroring `@repo/auth` — vraie logique (état, appels API), pas juste de l'UI :

```
packages/approval-flows/src/
  types/flow.ts, types/request.ts   → types partagés (FlowDetail, FlowSummary, RequestDetail, RequestSummary...)
  api/client.ts                      → getFlow, submitRequest, listTasks, listSubmissions, getRequest, decideRequest
  hooks/useApprovalFlow.ts           → fetch d'un flow par id
  hooks/useApprovalTasks.ts          → fetch "mes tâches" / "mes soumissions" + refetch
  components/ApprovalFlowWrapper.tsx → formulaire de soumission généré depuis fields_schema
  components/ApprovalTaskList.tsx    → liste de tâches avec actions Approuver/Rejeter
```

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
charge le flow (`fields_schema`), rend un input par champ (`text`/`number`/`date` —
`attachment` pas encore implémenté côté rendu), soumet via `submitRequest({ flow_id,
field_values, external_ref, callback_url }, basePath)`. Affiche un message de
confirmation avec le statut initial (`"pending"`) après soumission réussie. C'est le
composant qu'embarque l'intégration mode 1 de `hr` (`/demo-approval`, voir
`frontends/docs/apps/hr/HR.md`) en ne passant que `flowId="hr.leave_request"`.

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
- `flows/[id]/route.ts` (GET détail, PATCH édition)
- `flows/[id]/bindings/route.ts` (GET liste des bindings)
- `flows/[id]/bindings/[stepKey]/route.ts` (PUT)
- `requests/route.ts` (GET liste avec `mine`/`approver` en query string — transmise
  automatiquement par `forwardToBackend`, pas de code dédié nécessaire —, POST soumission)
- `requests/[id]/route.ts` (GET détail)
- `requests/[id]/decide/route.ts` (POST décision)

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
