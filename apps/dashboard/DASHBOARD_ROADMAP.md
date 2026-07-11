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
| 5 | **Widget Tableau croisé (pivot 2D)** + histogramme **empilé** | back+front | ⬜ | |
| 6 | **Cache court (TTL)** des requêtes widget + **timeout** garde-fou | back | ⬜ | |
| 7 | **Alertes / seuils** (valeur franchit un seuil → notification) | back+front | ⬜ | |
| 8 | **Drill-down** : clic sur un groupe → vue détaillée filtrée sur ce groupe | back+front | ⬜ | |
| 9 | **Filtres globaux** (barre partagée client/service/période appliquée à plusieurs widgets) | back+front | ⬜ | |
| 10 | **Tableaux de bord personnalisés (boards)** : pages nommées, widgets arrangés (grille) | back+front | ⬜ | |
| 11 | **Favoris / dossiers / tags** pour organiser les widgets | back+front | ⬜ | |
| 12 | **Mode plein écran / TV** | front | ⬜ | |
| 13 | **Export/envoi programmé** d'un board (PDF via `documents`/WeasyPrint, ou CSV) via `cron` | back+front | ⬜ | |
| 14 | **Jointures LEFT/externes** (aujourd'hui INNER only) | back+front | ⬜ | |
| 15 | **Widgets cross-app** (jointure en mémoire, multi-bases) | back+front | ⬜ | |

## Journal
- (base) Multi-sources + vue détaillée livrés et testés.
- #1 Périodes relatives (`presetRange`) + auto-refresh (`REFRESH_OPTIONS`, setInterval) sur la grille et la vue détaillée. Composant `PeriodFilter` réutilisable. tsc OK, routes 200.
- Note #7 (alertes) : finaliser l'envoi email du service `notifications` (SMTP par workspace) ; credentials de test fournis par l'utilisateur, à appliquer HORS dépôt.
- #2 `group_by(order, others)` : tri value/label asc/desc ; « Autres » = reste au-delà du Top-N (mesures additives count/sum). Form : Trier par + Top-N (groupby+table) + case « Autres ». Détail = tous les groupes, ordre appliqué, sans Autres. Test top2+Autres = total 425. Régression OK.
- #3 `group_by(having={operator,value})` : clause HAVING sur la mesure (opérateurs de comparaison). Form : « Ne garder que les groupes dont la valeur <op> <val> ». Détail respecte le HAVING. Test count>100 → VALIDEE seul. Régression OK.
- #4 mesure `computed` : `_measure_expr(formula={op,a,b})` → `(exprA) op (exprB)` (divide/percent/subtract/add/multiply, division protégée nullif). Propagé à aggregate/time_series/group_by/trend + comparison. Form : SubMeasureField A/B + opération. Test taux encaissement 100% (=sum/sum), reste dû, groupby computed, rejet op invalide. Régression OK.
