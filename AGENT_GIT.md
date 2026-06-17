# Règles Git — Agent Claude

> Ces règles s'appliquent à **toute modification de fichier** effectuée par l'agent.
> Les lire et les appliquer avant de toucher quoi que ce soit dans le code.

---

## Branches

### Branche principale de l'agent

La branche de base de tout le travail de l'agent est **`claude`**.
- Toutes les PR créées par l'agent ciblent `claude` (pas `main`, pas `master`, pas `develop`).
- Si la branche `claude` n'existe pas encore : `git checkout -b claude && git push -u origin claude`.

### Branche de travail

Avant toute modification, créer une branche dédiée à partir de `claude` :

```
claude-<type>/<nom-du-changement>
```

> **Pourquoi un tiret et non un slash ?** Git stocke les branches comme des fichiers dans `refs/heads/`. Une branche nommée `claude` (fichier) et une branche `claude/feature/x` (fichier dans un sous-dossier `claude/`) ne peuvent pas coexister. Le tiret (`claude-feature/x`) résout ce conflit tout en gardant le préfixe `claude` lisible.

**Types disponibles :**

| Type      | Usage                                                      |
|-----------|------------------------------------------------------------|
| `feature` | Nouvelle fonctionnalité                                    |
| `fix`     | Correction de bug                                          |
| `refactor`| Refactoring sans changement de comportement               |
| `docs`    | Modification de documentation uniquement                   |
| `style`   | Changements purement visuels / CSS                         |
| `chore`   | Tâche de maintenance (config, dépendances, scripts…)       |

**Exemples :**
```
claude-feature/dashboard-shell
claude-fix/workspace-switcher-dropdown
claude-docs/update-workspace-architecture
claude-refactor/sidebar-props
claude-chore/add-ui-package-exports
```

**Règle de nommage :** kebab-case, court, descriptif. Pas de numéros de ticket, pas de dates.

---

## Workflow complet — étape par étape

```
1. S'assurer d'être sur `claude` et à jour
   git checkout claude
   git pull origin claude

2. Créer la branche de travail
   git checkout -b claude-<type>/<nom>

3. Effectuer les modifications

4. Committer au fur et à mesure (commits atomiques)
   git add <fichiers concernés>
   git commit -m "<type>: <description courte>"

5. Pousser la branche
   git push -u origin claude-<type>/<nom>

6. Créer la PR vers `claude`
   gh pr create --base claude --title "..." --body "..."
```

---

## Commits

### Format du message

```
<type>(<scope optionnel>): <description courte en français>
```

**Exemples :**
```
feat(workspace): ajout du shell AppShell + Sidebar
fix(topbar): correction du z-index du popover AppSelector
docs(workspace): mise à jour architecture dashboard
refactor(ui): extraction Button et Avatar dans packages/ui
chore: ajout @repo/ui dans les dépendances de workspace
```

### Règles

- **Un commit = une intention**. Ne pas mélanger feature et fix dans le même commit.
- **Toujours stager les fichiers explicitement** (`git add <fichier>`) — jamais `git add .` ou `git add -A` pour éviter d'inclure `.env`, fichiers générés, etc.
- **Ne jamais committer** : `.env`, fichiers de build (`.next/`, `dist/`), `*.tsbuildinfo`, `.DS_Store`.
- **Ne pas amender** un commit déjà pushé. Créer un nouveau commit.

---

## Pull Request

### Cible

Toujours `--base claude`. Jamais vers `main`, `master` ou `develop` directement.

### Format

```
gh pr create \
  --base claude \
  --title "<type>(<scope>): <description courte>" \
  --body "$(cat <<'EOF'
## Résumé
- <bullet point des changements principaux>

## Fichiers modifiés
- `path/to/file` — raison

## Test
- [ ] <ce qu'il faut vérifier manuellement>
EOF
)"
```

### Règle

Une PR par branche de travail. Ne pas empiler plusieurs features dans la même PR.

---

## Ce qu'il ne faut jamais faire

- `git push --force` sur `claude` ou toute branche partagée
- `git reset --hard` sans confirmation explicite de l'utilisateur
- Committer directement sur `claude` (toujours passer par une branche)
- Sauter la création de branche "pour aller vite"
- Créer une PR vers `main` / `master` / `develop` sans instruction explicite de l'utilisateur
- Utiliser des noms de branches qui ne suivent pas le format `claude-<type>/<nom>` (ex: `feature/xyz`, `fix-bug` sont **interdits** pour les branches de l'agent)
- Créer des branches depuis `main`, `master` ou `develop` — toujours partir de `claude`

## Branches de travail — suppression automatique

Les branches de travail (`claude-<type>/<nom>`) sont **supprimées automatiquement** par GitHub après le merge de leur PR dans `claude`. C'est un paramètre activé sur le repo (`delete_branch_on_merge: true`).

Ne pas recréer manuellement une branche supprimée. Créer une nouvelle branche pour le prochain changement.

---

## Checklist avant de commencer

```
[ ] Je suis sur `claude` et à jour (git pull)
[ ] J'ai créé une branche claude-<type>/<nom> pour ce travail
[ ] Je connais les fichiers que je vais modifier
[ ] Pas de modifications non committées sur une autre branche
```

---

## Checklist avant de committer — OBLIGATOIRE

Pour chaque app modifiée, exécuter dans l'ordre :

```
[ ] 1. tsc --noEmit → 0 erreur
        cd apps/<app> && npx tsc --noEmit

[ ] 2. Smoke test de la route modifiée → pas de crash visible
        cd apps/<app> && npm run dev → ouvrir dans le navigateur

[ ] 3. next build → succès (avant d'ouvrir la PR, pas nécessairement avant chaque commit)
        cd apps/<app> && npx next build
```

Si un de ces contrôles échoue → corriger avant de committer. Ne jamais pusher une app qui ne compile pas.

Pour `packages/ui` ou `packages/auth` :
```
[ ] cd packages/ui && npx tsc --noEmit
[ ] Vérifier que les apps qui importent le package compilent aussi
```

Référence complète : `docs/TESTING.md`
