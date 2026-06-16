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
claude/<type>/<nom-du-changement>
```

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
claude/feature/dashboard-shell
claude/fix/workspace-switcher-dropdown
claude/docs/update-workspace-architecture
claude/refactor/sidebar-props
claude/chore/add-ui-package-exports
```

**Règle de nommage :** kebab-case, court, descriptif. Pas de numéros de ticket, pas de dates.

---

## Workflow complet — étape par étape

```
1. S'assurer d'être sur `claude` et à jour
   git checkout claude
   git pull origin claude

2. Créer la branche de travail
   git checkout -b claude/<type>/<nom>

3. Effectuer les modifications

4. Committer au fur et à mesure (commits atomiques)
   git add <fichiers concernés>
   git commit -m "<type>: <description courte>"

5. Pousser la branche
   git push -u origin claude/<type>/<nom>

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

---

## Vérification avant de commencer

Avant toute session de modification, exécuter mentalement cette checklist :

```
[ ] Je suis sur la branche `claude` (ou je vais la créer si elle n'existe pas)
[ ] J'ai créé une branche claude/<type>/<nom> pour ce travail
[ ] Je connais les fichiers que je vais modifier
[ ] Je n'ai pas de modifications non committées en cours sur une autre branche
```
