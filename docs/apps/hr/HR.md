# App HR — Documentation

**Port :** 3003
**Next.js 16, App Router**
**Rôle :** Module Ressources Humaines du SAAS Workspace — sert aussi de démonstration
minimaliste du registre RBAC multi-application (voir `backends/docs/services/hr/HR.md`).

---

## État actuel

Câblage session/auth/RBAC complet, mirroring exact du pattern `apps/workspace` :

- `app/layout.tsx` (Server Component, `async`) appelle `getServerSession()` et gate
  l'accès sur la permission `hr.access` (sinon `<AccessDenied appName="RH" />` de
  `@repo/ui`, même composant que `workspace`). Si autorisé, monte `<SessionProvider>`.
- `proxy.ts` (middleware racine) redirige vers l'app `auth` si pas de cookie
  `access_token` — copie exacte de `apps/workspace/proxy.ts`.
- `app/api/auth/session/route.ts` — proxy cookie → `auth` (filet de sécurité client,
  même pattern que `workspace`).
- `app/api/departments/route.ts` — proxy cookie → le service backend `hr` (FastAPI,
  port 5001, `GET /hr/departments`).
- `app/api/logout/route.ts` — identique à `workspace`.
- `components/DashboardShell.tsx` — shell minimal (`AppShell`/`Sidebar`/`TopBar` de
  `@repo/ui`), un seul item de nav ("Accueil"). Le sélecteur d'app (`TopBar`) filtre la
  liste avec `usePermissions().can(\`${app.id}.access\`)`, même logique que `workspace`.
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
