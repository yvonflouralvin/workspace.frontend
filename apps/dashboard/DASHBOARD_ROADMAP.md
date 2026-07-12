# Dashboard — Roadmap d'améliorations (tracker)

> Suivi d'implémentation des améliorations widgets/dashboard. Implémentées **une par une** :
> implémenter → tester (backend TestClient + `tsc` + compile route) → **commit** → cocher ici → suivante.
> Règle : **zéro régression** — le smoke test de non-régression doit passer après chaque item.

Légende : ⬜ à faire · 🔶 en cours · ✅ fait

## Base (déjà livrée)
- ✅ Widgets multi-sources (jointure même-app) — backend `11865b5`, frontend `61dce80`
- ✅ Vue détaillée « Voir plus » (tableau paginé, recherche, export CSV, consciente de l'agrégation)

## Backlog (ordre d'implémentation)

| # | Amélioration | Portée | Statut | Commits |
|---|--------------|--------|--------|---------|
| 1 | **Périodes relatives** (7 derniers jours, ce mois, mois dernier, cette année…) + **auto-refresh** par widget | front | ✅ | `lib/periods.ts`, `PeriodFilter` |
| 2 | **Tri configurable** du regroupement (label/valeur, asc/desc) + **Top-N + « Autres »** | back+front | ✅ | `group_by(order, others)` |
| 3 | **Filtres sur agrégat (HAVING)** — ex. groupes dont somme > X | back+front | ✅ | `group_by(having)` |
| 4 | **Mesures calculées** (a/b, a−b, marge, taux) au-delà de count/sum/avg | back+front | ✅ | `measure="computed"`, `formula` |
| 5 | **Widget Tableau croisé (pivot 2D)** + histogramme **empilé** | back+front | ✅ | `direct_reader.pivot`, `PivotView` |
| 6 | **Cache court (TTL)** des requêtes widget + **timeout** garde-fou | back | ✅ | `services/cache.py`, statement_timeout |
| 7 | **Alertes / seuils** (valeur franchit un seuil → notification) | back+front | ✅ | `models/alert`, `services/alerts`, `AlertsPanel` + email SMTP |
| 8 | **Drill-down** : clic sur un groupe → vue détaillée filtrée sur ce groupe | back+front | ✅ | `_drill_rows`, table cliquable |
| 9 | **Filtres globaux** (barre partagée client/service/période appliquée à plusieurs widgets) | back+front | ✅ | `_inject_filter` + barre board |
| 10 | **Tableaux de bord personnalisés (boards)** : pages nommées, widgets arrangés (grille) | back+front | ✅ | `models/board`, `/boards`, `/boards/[id]` (fait avant #9 : #9 s'appuie dessus) |
| 11 | **Favoris / dossiers / tags** pour organiser les widgets | front | ✅ | `config.tags`/`config.favorite` (sans migration) |
| 12 | **Mode plein écran / TV** | front | ✅ | Fullscreen API sur board |
| 13 | **Export/envoi programmé** (CSV d'un widget par email) via boucle de fond | back+front | ✅ | `scheduled_reports` + PJ email |
| 14 | **Jointures LEFT/externes** (aujourd'hui INNER only) | back+front | ✅ | `_from_where` (JOIN explicites), `source.join` |
| 15 | **Widgets cross-app** (jointure en mémoire, multi-bases) | back+front | ⬜ | |

## Journal
- (base) Multi-sources + vue détaillée livrés et testés.
- #1 Périodes relatives (`presetRange`) + auto-refresh (`REFRESH_OPTIONS`, setInterval) sur la grille et la vue détaillée. Composant `PeriodFilter` réutilisable. tsc OK, routes 200.
- Note #7 (alertes) : finaliser l'envoi email du service `notifications` (SMTP par workspace) ; credentials de test fournis par l'utilisateur, à appliquer HORS dépôt.
- #2 `group_by(order, others)` : tri value/label asc/desc ; « Autres » = reste au-delà du Top-N (mesures additives count/sum). Form : Trier par + Top-N (groupby+table) + case « Autres ». Détail = tous les groupes, ordre appliqué, sans Autres. Test top2+Autres = total 425. Régression OK.
- #3 `group_by(having={operator,value})` : clause HAVING sur la mesure (opérateurs de comparaison). Form : « Ne garder que les groupes dont la valeur <op> <val> ». Détail respecte le HAVING. Test count>100 → VALIDEE seul. Régression OK.
- #4 mesure `computed` : `_measure_expr(formula={op,a,b})` → `(exprA) op (exprB)` (divide/percent/subtract/add/multiply, division protégée nullif). Propagé à aggregate/time_series/group_by/trend + comparison. Form : SubMeasureField A/B + opération. Test taux encaissement 100% (=sum/sum), reste dû, groupby computed, rejet op invalide. Régression OK.
- #5 widget `pivot` : `direct_reader.pivot(row_group,col_group)` → {cols, rows:[{label,total,cells}]} (Top-N lignes/colonnes). Rendu `PivotView` (tableau croisé + histogramme empilé CSS). Détail = triples (ligne,colonne,valeur). Validation 2 dimensions. Test factures statut×mode. Régression OK.
- #6 cache TTL (`services/cache.py`, env `WIDGET_CACHE_TTL`=20s, clé inclut `updated_at` → invalidation auto à l'édition) sur /data et /rows ; timeout Postgres `statement_timeout` (env `WIDGET_STATEMENT_TIMEOUT_MS`=15000) sur les moteurs `direct_reader`. Test : 381 servi 2×, 32 après édition. Régression OK.
- #12 plein écran/TV : bouton « Plein écran » sur `/boards/[id]` (Fullscreen API sur le conteneur du board) + auto-refresh existant. tsc OK.
- #11 favoris/étiquettes : stockés dans `config.tags` (liste) + `config.favorite` (bool) — **aucune migration**. Form : champ étiquettes + case Favori. Grille : filtre par étiquette + « Favoris uniquement », étoile cliquable par carte (PATCH), favoris triés en tête. tsc OK.
- #13 export programmé : **notifications** — support des pièces jointes (`attachments[]` base64 dans `mailer`/schema/dispatch). **dashboard** — `models/scheduled_report` + migration 0007, `services/scheduled_reports` (is_due daily/weekly/monthly, construit le CSV via `_detail_rows`, envoie via `notifications_client` avec PJ), router CRUD + `/run` (envoyer maintenant), boucle de fond (run_due dans la boucle d'alertes). Front : `ScheduledReportsPanel` sur la vue détaillée (widgets exportables). Test : run now → email réel avec CSV en PJ, is_due, rejets. Régression OK. (PDF WeasyPrint = évolution future ; CSV retenu.)
- #14 jointures LEFT : `_from_where` unifié — INNER par défaut (`FROM a,b`), sinon JOIN explicites avec ON (prédicats liant la source + workspace/période de la source dans ON pour préserver LEFT ; filtres primaire en WHERE). `source.join`='inner'|'left'. aggregate/group_by/pivot ; timeseries/rows restent INNER. Front : sélecteur jointure/externe par source non primaire. Test commandes⟕factures INNER 14 vs LEFT 426. Régression OK.
- #9 filtres globaux : `_inject_filter` (condition d'égalité `champ=valeur` ajoutée sur la source qui porte le champ ; ignoré si absent) sur `/data` (params `filter_field`/`filter_value`, clé de cache étendue). Front : `getWidgetData(..., filterField, filterValue)` + barre de filtre global sur `/boards/[id]` (période déjà partagée). Test 425→381, champ absent ignoré, groupby→1 groupe. Régression OK.
- #10 boards : `models/board` + migration 0006, router CRUD `/dashboard/boards` (+ GET résolu widgets), perm view=widgets.view / manage=reports.compose. Front : nav « Tableaux de bord », page liste `/boards` (créer/supprimer), page `/boards/[id]` (grille 3 col, span 1-3, période partagée + auto-refresh ; édition : ajouter/retirer/réordonner/redimensionner/renommer). Test CRUD + reorder/resize + widget invalide filtré. **NB : réalisé avant #9** (les filtres globaux s'appliquent à un board). Régression OK.
- #8 drill-down : `_drill_rows` (endpoints rows/export acceptent `drill_field`/`drill_value` → enregistrements bruts du groupe, condition d'égalité ajoutée). Front : lignes agrégées cliquables sur la vue détaillée → bascule en lignes brutes + fil d'Ariane « ↩ Revenir aux groupes ». Test drill VALIDEE = 381 (== count agrégé), export 381. Régression OK.
- #7 alertes/seuils : **notifications** — finalisé l'envoi email SMTP (`mailer.py` + dispatch, branche `claude-feature/notifications-email-smtp`, commit `3c15332`) ; SMTP du workspace 1 configuré runtime (Hostinger, HORS dépôt) ; email de test réel OK. **dashboard** — `models/alert` + migration 0005, `services/alerts` (valeur scalaire, anti-rebond ok→triggered, email via `notifications_client`), router CRUD + `/alerts/{id}/test` + `/internal/alerts/evaluate`, tâche de fond périodique (`alert_eval_interval`=300s). Front : `AlertsPanel` sur la vue détaillée (widgets scalaires count/gauge/trend/ratio). Test : alerte >100 sur 381 → email envoyé, anti-rebond, rejets. Régression OK.
