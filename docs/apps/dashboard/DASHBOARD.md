# Dashboard — Reporting & Widgets

App de reporting transversale (front `apps/dashboard`, port 3012 ; backend
`backends/dashboard`, FastAPI). Elle agrège des données **en temps réel** issues des
autres applications.

## Architecture (principes)

- **Lecture directe des bases.** Pour les widgets, le dashboard lit **directement** dans la
  base de chaque app (`services/direct_reader.py`, engine SQLAlchemy sur le `database_url`
  déclaré par l'app), **pas via API**. Requêtes de lecture seule uniquement, scopées
  `workspace_id`, avec garde-fous d'injection (identifiants validés, requêtes paramétrées).
- **Auto-enregistrement des schémas.** Chaque app déclare au boot ses modèles/champs/types
  (et valeurs enum) + son `database_url` → menu **Sources de données** (`/sources`).
  **Anonymisation** : une app n'expose pas forcément toutes ses colonnes/tables
  (`_EXCLUDED_FIELDS`/`_EXCLUDED_TABLES` dans son `schema_registry.py`).
- **Contrat de reporting** (séparé des widgets) : rapports pré-câblés servis par API
  `/internal/reporting` (menu Rapports). Voir `AGENTS.md` racine.
- **Convention modèles** : toute table doit porter `created_at`, `updated_at`, `created_by`,
  `updated_by` (created_at = filtrage période/série temporelle).

## Moteur commun des widgets

Tous les widgets partagent : **mesure** (`count` / `sum` / `avg` / `min` / `max` sur une
colonne numérique) + **conditions** (opérateurs `=`, `≠`, `>`, `≥`, `<`, `≤`, `contains`,
`starts_with`, `ends_with`, `is_true`, `is_false`) + **filtre de période** (sur `created_at`).
Le **type est verrouillé après création**.

## Types de widget

### Existants ✅
- **Comptage** — une mesure (count/somme/moyenne…) d'un modèle. `direct_reader.aggregate`.
- **Comparaison** — plusieurs séries (chacune source/modèle/mesure/conditions), rendu
  chiffres (ligne/colonne) · histogramme (V/H) · camembert. `ComparisonView`.
- **Série temporelle** — évolution d'une mesure par bucket (jour/semaine/mois) sur
  `created_at`, trous comblés, rendu courbe. `direct_reader.time_series` → `TimeseriesView`.
- **Regroupement** — répartition d'une mesure par valeur distincte d'une colonne (GROUP BY),
  avec **référence de libellé** optionnelle (résout un ID en libellé via un modèle de la même
  base). `direct_reader.group_by` → `ComparisonView`.

### Roadmap — nouveaux types
- **KPI de tendance** — un chiffre + **delta vs période précédente** (+X %) + **sparkline**.
  _(prochaine étape)_
- **Jauge / Objectif** — une valeur vs un seuil/cible, colorée (bon/attention/critique).
- **Table / Top-N** — afficher de vraies lignes (pas un agrégat) ; colonnes au choix, dans le
  respect de l'anonymisation.
- **Ratio / Pourcentage** — une valeur en % d'une autre (ex. taux de paiement).
- **Entonnoir (funnel)** — étapes successives (créées → validées → payées).
- **Heatmap calendrier** — densité d'activité par jour sur `created_at`.
- **Texte / Titre** — bloc de note pour structurer/annoter un dashboard.

## Roadmap — améliorations des widgets existants

- **Comptage** : delta vs période précédente + sparkline ; unité/format (%, FC, préfixe/
  suffixe) ; comparaison à un objectif coloré.
- **Regroupement / Comparaison** : tri (valeur/libellé) ; Top-N + « Autres » (regrouper la
  traîne) ; barres empilées / 100 % (2ᵉ dimension) ; référence de libellé **cross-app** (via
  le `database_url` d'une autre app).
- **Série temporelle** : plusieurs séries sur un même graphe ; moyenne mobile / cumulé ;
  courbe fantôme de la période précédente ; aire/barres au choix.
- **Transversal (tous)** : rafraîchissement auto temps réel ; taille du widget
  (petit/moyen/large) dans la grille ; drill-down (cliquer une part → filtrer) ; export
  CSV/image ; duplication.

## Roadmap — niveau dashboard (organisation)

- Réorganisation drag & drop + tailles des widgets.
- Plusieurs tableaux de bord (onglets) et partage.
- Filtres globaux partagés (la période existe déjà).

## Priorités recommandées

1. **KPI de tendance** (delta + sparkline) — gros impact, peu de travail.
2. **Jauge / Objectif** — simple et très visuel.
3. **Table Top-N** — le seul qui montre les données brutes.
4. **Organisation** (drag & drop + tailles) — dès qu'il y a beaucoup de widgets.
