# Stratégie de tests — Monorepo Frontends

## Principe

Toute implémentation doit passer les vérifications ci-dessous **avant d'être committée**. L'objectif est d'attraper les erreurs le plus tôt possible — avant que l'app ne soit déployée ou que le prochain développeur ne soit bloqué.

---

## Niveaux de vérification

### Niveau 1 — TypeScript (obligatoire, < 30s)

```bash
# Depuis une app spécifique
cd apps/workspace && npx tsc --noEmit

# Ou pour tout le monorepo
npm run check-types
```

**Quand :** avant chaque commit. Zéro tolérance pour les erreurs TypeScript.

**Ce que ça attrape :** imports manquants, props incorrectes, types incompatibles, exports manquants dans les packages.

---

### Niveau 2 — Build Next.js (obligatoire avant PR)

```bash
cd apps/workspace && npx next build
```

**Quand :** avant d'ouvrir une PR. Un build cassé = PR bloquée.

**Ce que ça attrape :** erreurs de compilation que `tsc` ne voit pas (dynamic imports, RSC incompatibilités, chunks manquants), pages qui crashent au rendu, erreurs de config.

---

### Niveau 3 — Smoke test manuel (obligatoire avant PR)

Pour chaque modification, vérifier manuellement les flux concernés :

| Modification             | Pages à tester                              |
|--------------------------|---------------------------------------------|
| Shell (sidebar/topbar)   | `/`, nav vers chaque item, logout           |
| WorkspaceSwitcher        | dropdown, liste workspaces, "créer"         |
| AppSelector              | recherche, apps récentes, "toutes les apps" |
| Composant `@repo/ui`     | toutes les apps qui l'importent             |
| Route handler (`/api/*`) | appel direct + comportement en cas d'erreur |
| Proxy (`proxy.ts`)       | accès sans cookie → redirect auth           |

Tester aussi : **rechargement de page** (pas seulement la navigation client), **mode déconnecté** (pas de backend), **taille mobile** (sidebar responsive si applicable).

---

### Niveau 4 — Tests unitaires Vitest (à venir)

À installer quand les premiers helpers/stores deviennent non triviaux :

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

Cibles prioritaires :
- Fonctions utilitaires pures (`getWorkspaceColor`, `useRecentApps`, etc.)
- Logique du store Zustand (`session.store` : loadSession, logout)
- Composants UI stateless (`StatCard`, `NavItem` actif/inactif)

---

### Niveau 5 — Tests E2E Playwright (à venir)

À installer quand les flux critiques sont stables :

```bash
npm install -D @playwright/test
```

Flux critiques à couvrir en premier :
1. Login → redirect workspace → dashboard visible
2. Logout → redirect auth
3. Navigation dans la sidebar (tous les items)
4. WorkspaceSwitcher : switch de workspace

---

## Règles immédiates (applicables dès maintenant)

1. **`tsc --noEmit` doit passer à zéro** avant tout commit sur une app.
2. **`next build` doit réussir** avant d'ouvrir une PR.
3. **Smoke test de la route modifiée** avant tout push.
4. **Ne jamais committer un `console.log`** laissé pour déboguer.
5. Si un test existant casse → le corriger dans le même commit, pas dans un commit séparé.

---

## Commandes de référence

```bash
# Vérification types — workspace app
cd apps/workspace && npx tsc --noEmit

# Vérification types — packages/ui
cd packages/ui && npx tsc --noEmit

# Build workspace
cd apps/workspace && npx next build

# Démarrer workspace seul (dev)
cd apps/workspace && npm run dev

# Démarrer tout le monorepo
npm run dev   # depuis la racine
```

---

## Pourquoi pas de tests automatiques dès maintenant ?

Installer Vitest/Playwright avant d'avoir des comportements stables à tester crée de la dette de maintenance (tests fragiles, faux positifs). La règle est : **on installe les tests quand on a quelque chose à tester qui ne change plus**. Les niveaux 1 et 2 (TypeScript + build) offrent déjà une bonne filet de sécurité pour l'état actuel du projet.
