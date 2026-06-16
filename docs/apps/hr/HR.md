# App HR — Documentation

**Port :** 3003
**Next.js 16, App Router**
**Rôle :** Module Ressources Humaines du SAAS Workspace.

---

## État actuel

L'app est initialisée mais vide — `app/page.tsx` et `app/layout.tsx` sont des stubs générés par `create-next-app`. Aucune fonctionnalité n'est encore implémentée.

---

## Intégration dans le shell partagé

Quand l'implémentation démarrera, cette app devra :

1. Utiliser `<AppShell>` de `@repo/ui` avec ses propres `navItems` HR.
2. Ne **pas** passer de `topSlot` à la Sidebar (pas de workspace switcher ici — l'utilisateur a déjà un workspace actif).
3. Partager la `TopBar` avec les mêmes `apps[]` que le workspace pour permettre la navigation inter-apps.

```tsx
// apps/hr/app/(dashboard)/layout.tsx — à venir
const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/',         icon: <HomeIcon /> },
  { label: 'Employés',        href: '/employees', icon: <PeopleIcon /> },
  { label: 'Congés',          href: '/leaves',    icon: <CalendarIcon /> },
  { label: 'Recrutement',     href: '/jobs',      icon: <WorkIcon /> },
]
```

---

## Variables d'environnement

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|-------------------------|
| `NEXT_PUBLIC_AUTH_API`            | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`| Browser | `http://localhost:3001`  |

---

## Notes

- Pas de `middleware.ts` pour l'instant — à ajouter (même logique que workspace : redirect vers auth si pas de cookie).
- `@repo/auth` doit être ajouté aux dépendances quand l'implémentation démarre.
