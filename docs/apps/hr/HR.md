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
  `@repo/ui`), un seul item de nav ("Accueil", lien **absolu** vers `NEXT_PUBLIC_WORKSPACE_DOMAIN`
  — "Accueil" doit toujours renvoyer vers l'app `workspace`, quelle que soit l'app
  courante). `topSlot={<WorkspaceSwitcher filterPermission="hr.access" />}` rend le
  switcher de workspace visible dans la sidebar comme dans `workspace` (filtré sur
  `hr.access` pour éviter de basculer vers un workspace où l'utilisateur n'a pas accès à
  RH). Le sélecteur d'app (`TopBar`) filtre la liste avec
  `usePermissions().can(\`${app.id}.access\`)`, même logique que `workspace`.
- `app/page.tsx` — Client Component : si `can("hr.departments.view")`, fetch
  `/api/departments` et affiche la liste mock ; sinon "Accès restreint à cette section".

Une seule page existe pour l'instant (`/`, départements). Pas de gestion réelle
employés/congés/recrutement — hors périmètre de cette itération (focus = architecture RBAC,
pas fonctionnalités RH).

---

## Variables d'environnement (`.env`)

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|--------------------------|
| `AUTH_API_URL`                     | Server  | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API`             | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN` | Browser | `http://localhost:3001` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`     | Browser | `http://localhost:3005` |
| `HR_API_URL`                       | Server  | `http://127.0.0.1:5001` (backend FastAPI `hr`) |

---

## Notes

- Dépend du service backend `hr` (FastAPI, `backends/hr/`, port 5001) — doit tourner pour
  que `/api/departments` réponde. Voir `backends/docs/services/hr/HR.md`.
- Dépend du registre `App`/`Permission` du service `auth` : `hr.access` et
  `hr.departments.view` doivent exister (enregistrés automatiquement par le service `hr`
  au démarrage via `POST /auth/apps/register`).
