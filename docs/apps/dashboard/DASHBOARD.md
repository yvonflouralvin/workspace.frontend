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

### Sources multiples (jointure même-app)

Un widget peut porter **plusieurs sources (modèles) de LA MÊME application** (donc la même
base — contrainte « 1 base par service »). Le moteur assemble alors **une seule requête SQL**
avec un **INNER JOIN implicite** : `FROM "t1" AS "s1", "t2" AS "s2" WHERE <toutes les
conditions>`. Chaque source a un id local (`s1`, `s2`…) servant d'alias ; **toutes les
colonnes sont qualifiées** `"s1"."champ"`.

- **Condition = littéral OU colonne.** La valeur d'une condition est soit un littéral
  (`{kind:"literal", value}`), soit **la colonne d'une autre source**
  (`{kind:"column", source, field}` → prédicat de jointure, opérateurs de comparaison
  uniquement). Une réf. intra-source compare deux colonnes du même modèle (ex.
  `montant_paye < montant_total`).
- **Agrégat = modèle + colonne.** `aggregate: {source, field}` désigne la source et la
  colonne numérique agrégées (`count` = lignes de l'ensemble joint, sans source).
- **`workspace_id`** est filtré sur **chaque** source qui porte la colonne (une table enfant
  jointe sans `workspace_id` reste tenant-safe via le parent).
- **Config** : `config.sources[] = [{id, provider, model}]` (même `provider` partout, validé),
  `config.conditions[] = [{source, field, operator, value}]`, `config.aggregate`,
  `config.group = {source, field}` (groupby/table), `config.period = {source}`. Les
  `provider`/`model` top-level du widget = source primaire (rétro-compat). Les widgets
  **legacy** mono-source (conditions plates, `field`, `group_by`) sont **normalisés** à la
  lecture en une source unique `s1` — aucune migration. Cf. `_normalize_spec` /
  `_resolve` dans `backends/dashboard/routers/widgets.py` et le constructeur multi-tables de
  `services/direct_reader.py`. UI : `SpecEditor` réutilisable dans `WidgetForm.tsx`.

### Filtre de période (vue Widgets)

Le filtre **Du / Au** de la page `/widgets` est **global** : le front renvoie `from`/`to` à
`GET /widgets/{id}/data` pour **chaque** widget. Dans un widget multi-sources, la période
s'applique au `created_at` de la **source désignée** par `config.period.source` (choisie dans
le formulaire ; défaut = source primaire). Bornes `created_at >= from` et `< to + 1 jour`.

- **Agrégats** (comptage, jauge, ratio, comparaison, regroupement, palmarès) : bornes
  ajoutées directement dans le `WHERE` (`aggregate` / `group_by`).
- **Série temporelle / KPI de tendance** : la période **remplace** la fenêtre « N derniers
  buckets ». La série couvre les buckets de `[from, to]` ; pour la tendance, la fenêtre
  courante = `[from, to]` et la précédente = l'intervalle de **même longueur juste avant**.
  Sans période, comportement historique (N derniers buckets). Cf. `direct_reader.time_series`
  / `trend` (params `frm`/`to`).

### Vue détaillée d'un widget (« Voir plus »)

Chaque carte widget a un bouton **« Voir plus »** → page `/widgets/[id]` : le **widget en
pleine largeur** en haut, et en bas le **tableau des données qui génèrent la valeur**. Le
tableau est **conscient de l'agrégation du widget** (`_detail_rows`) :

- **`groupby` / `table`** → lignes **agrégées** (catégorie → mesure), pas la liste brute.
  Réutilise `direct_reader.group_by` (toutes les catégories, non plafonné par la limite
  d'affichage). Colonnes fixes : `[<colonne de regroupement>, <mesure>]`.
- **`timeseries` / `trend`** → une ligne par bucket (période → valeur). Réutilise
  `direct_reader.time_series`.
- **`count` / `gauge`** (agrégat scalaire) → les **enregistrements bruts** derrière la valeur
  (même ensemble joint, on **SELECT les colonnes configurées** ; `direct_reader.rows`).
  C'est le **seul** cas où l'on configure les colonnes.

- **Colonnes (count/gauge uniquement)** : `config.columns = [{source, field, label?, width?}]`
  (largeur en % ; vide = toutes les colonnes des modèles). Configurées dans l'éditeur
  (`DetailColumnsSection`, masqué pour les types agrégés), avec **aperçu 3 lignes**
  (`POST /widgets/preview-rows`, config non enregistrée, branche aussi par type).
- **Pagination serveur** (`page`/`page_size`) + **recherche** (`q`, `ILIKE` sur cast text) :
  par défaut sur toutes les colonnes des modèles, restreignable via
  `config.search_fields = [{source, field}]`.
- **Filtre période Du/Au** identique à la grille (sur `config.period.source`).
- **Téléchargement CSV** (`GET /widgets/{id}/export`) : respecte période + recherche, **ignore
  la pagination** (toutes les lignes, plafond `_EXPORT_CAP`). BOM UTF-8 pour Excel. Route BFF
  `export` en **pass-through brut** (pas de chiffrement `@repo/network`, déclenché par
  `<a download>`).
- **Indisponible pour `comparison`/`ratio`** (sources indépendantes, pas d'ensemble joint
  unique) → 400 côté API, message côté page.

Endpoints : `GET /widgets/{id}/rows`, `GET /widgets/{id}/export`, `POST /widgets/preview-rows`
(`routers/widgets.py`). Client : `getWidgetRows` / `widgetExportUrl` / `previewRows`
(`lib/dashboard-api.ts`). Rendu widget réutilisable : `components/WidgetView.tsx`.

## Types de widget

### Existants ✅
- **Comptage** — une mesure (count/somme/moyenne…) d'un modèle. `direct_reader.aggregate`.
- **KPI de tendance** — une mesure sur la fenêtre courante + delta vs période précédente +
  sparkline. `direct_reader.trend` (compose aggregate + time_series) → `TrendView`.
- **Comparaison** — plusieurs séries (chacune source/modèle/mesure/conditions), rendu
  chiffres (ligne/colonne) · histogramme (V/H) · camembert. `ComparisonView`.
- **Série temporelle** — évolution d'une mesure par bucket (jour/semaine/mois) sur
  `created_at`, trous comblés, rendu courbe. `direct_reader.time_series` → `TimeseriesView`.
- **Regroupement** — répartition d'une mesure par valeur distincte d'une colonne (GROUP BY),
  avec **référence de libellé** optionnelle (résout un ID en libellé via un modèle de la même
  base). `direct_reader.group_by` → `ComparisonView`.
- **Jauge / Objectif** — une valeur vs une cible, colorée selon des **seuils configurables**
  (en % de la cible : bon/alerte/critique) et le sens favorable (higher/lower). Repères de
  seuils dessinés sur l'arc. `direct_reader.aggregate` → `GaugeView` / `@repo/ui/charts/GaugeChart`.
- **Tableau / palmarès** — classement **top‑N** d'une mesure par catégorie (GROUP BY trié
  décroissant, `limit` configurable), rendu en liste classée (rang + barre proportionnelle).
  Réutilise `direct_reader.group_by` (avec référence de libellé) → `LeaderboardView`.
- **Ratio / Pourcentage** — une valeur (numérateur) en % d'une autre (dénominateur), chacune
  étant un agrégat complet (source/modèle/mesure/conditions, indépendants). Format % ou ratio
  (×), garde-fou dénominateur nul. Deux `direct_reader.aggregate` → `RatioView`.

### Roadmap — nouveaux types
- **Table brute** — afficher de vraies lignes (pas un agrégat) ; colonnes au choix, dans le
  respect de l'anonymisation (variante du palmarès actuel qui, lui, reste agrégé).
- **Entonnoir (funnel)** — étapes successives (créées → validées → payées).
- **Heatmap calendrier** — densité d'activité par jour sur `created_at`.
- **Texte / Titre** — bloc de note pour structurer/annoter un dashboard.

## Roadmap — améliorations des widgets existants

- **Comptage** : delta vs période précédente + sparkline ; unité/format (%, FC, préfixe/
  suffixe) ; comparaison à un objectif coloré.
- **Regroupement / Comparaison** : tri (valeur/libellé) ; « Autres » (regrouper la traîne
  au-delà du Top-N) ; barres empilées / 100 % (2ᵉ dimension) ; référence de libellé
  **cross-app** (via le `database_url` d'une autre app).
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

1. ~~**KPI de tendance**~~ ✅ · ~~**Jauge / Objectif**~~ ✅ · ~~**Tableau / palmarès**~~ ✅ (livrés)
2. **Table brute** — la seule vue qui montrerait les lignes non agrégées (anonymisation).
3. **Organisation** (drag & drop + tailles) — dès qu'il y a beaucoup de widgets.
4. **Transversal** — rafraîchissement auto temps réel, export, duplication.
