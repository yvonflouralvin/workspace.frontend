"use client";

import { LockOutlined, ReportGmailerrorredOutlined } from "@mui/icons-material";
import { verdictLabel, type Decision, type Forcage, type JalonDetail } from "@/app/lib/jalons-api";
import { fmtInstant } from "./JalonBadges";

/** Durée écoulée, dite sans adjectif : c'est un CONSTAT, pas un jugement. */
function ecart(secondes: number): string {
  if (secondes < 60) return "moins d'une minute";
  if (secondes < 3600) {
    const m = Math.round(secondes / 60);
    return `${m} minute${m > 1 ? "s" : ""}`;
  }
  if (secondes < 86400) {
    const h = Math.round(secondes / 3600);
    return `${h} heure${h > 1 ? "s" : ""}`;
  }
  const j = Math.round(secondes / 86400);
  return `${j} jour${j > 1 ? "s" : ""}`;
}

/** L'histoire de la gate : décisions et passages en force, dans un seul fil.
 *
 *  Les séparer laisserait croire qu'un contournement est un événement d'une autre
 *  nature, à consulter ailleurs. C'est le contraire : il doit se voir DAVANTAGE
 *  qu'une décision normale. */
export function HistoriqueJalon({ jalon }: { jalon: JalonDetail }) {
  const entrees = [
    ...jalon.decisions.map((d) => ({ type: "decision" as const, at: d.decide_le, decision: d })),
    ...jalon.forcages.map((f) => ({ type: "forcage" as const, at: f.le, forcage: f })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const courante = jalon.decisions[0] ?? null;

  return (
    <section>
      <p className="text-label-sm uppercase text-outline mb-2">Historique</p>

      {entrees.length === 0 ? (
        <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface-variant">
          Rien ne s&apos;est encore joué sur ce jalon.
        </p>
      ) : (
        <div className="space-y-3">
          {entrees.map((entree) =>
            entree.type === "forcage" ? (
              <CarteForcage key={`f-${entree.forcage.id}`} forcage={entree.forcage} />
            ) : (
              <CarteDecision
                key={`d-${entree.decision.id}`}
                jalon={jalon}
                decision={entree.decision}
                courante={entree.decision.id === courante?.id}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function CarteDecision({
  jalon,
  decision,
  courante,
}: {
  jalon: JalonDetail;
  decision: Decision;
  courante: boolean;
}) {
  const revisee = jalon.decisions.find((d) => d.id === decision.revise_decision_id) ?? null;
  const snapshot = decision.criteres_snapshot ?? [];
  const figeLe = snapshot.find((c) => c.verrouille_le)?.verrouille_le ?? null;

  return (
    <article className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-md font-semibold text-on-surface">
          {verdictLabel(jalon.role, decision.verdict)}
        </span>
        {courante && (
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold uppercase text-on-surface-variant">
            Décision courante
          </span>
        )}
        <span className="ml-auto text-label-md text-outline">{fmtInstant(decision.decide_le)}</span>
      </div>

      <p className="mt-1 text-body-sm text-on-surface-variant">
        Rendue par {decision.decide_par_nom_cache ?? "—"}
        {revisee && ` · Révise la décision du ${fmtInstant(revisee.decide_le)}`}
      </p>

      {/* CONSTAT neutre : le repli propriétaire est une décision normale, pas un
          contournement. Aucune coloration ne doit le suggérer. */}
      {decision.hors_decideur_designe && (
        <p className="mt-1 text-label-md text-on-surface-variant">
          Rendue hors du décideur désigné pour ce jalon.
        </p>
      )}

      {decision.secondes_entre_verrouillage_et_decision != null && (
        <p className="mt-0.5 text-label-md text-outline">
          Critères figés {ecart(decision.secondes_entre_verrouillage_et_decision)} avant la
          décision.
        </p>
      )}

      {decision.commentaire && (
        <p className="mt-2 text-body-sm text-on-surface whitespace-pre-wrap">
          {decision.commentaire}
        </p>
      )}

      {snapshot.length > 0 && (
        // Archive : ces valeurs ne sont PAS relues depuis les critères actuels.
        // Modifier un critère demain ne réécrit pas ce qui a été jugé hier.
        <div className="mt-3 rounded-xl bg-locked-surface border border-locked-container/60 p-3">
          <p className="flex items-center gap-1.5 text-label-md font-medium text-locked">
            <LockOutlined style={{ fontSize: 13 }} />
            Critères tels que figés{figeLe ? ` le ${fmtInstant(figeLe)}` : ""}
          </p>
          <ul className="mt-2 space-y-1">
            {snapshot.map((critere) => (
              <li
                key={critere.critere_id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm"
              >
                <span className="text-on-surface">{critere.libelle}</span>
                <span className="text-on-surface-variant">
                  {critere.cible ? `Cible ${critere.cible} · ` : ""}
                  Constaté : {critere.valeur_constatee ?? "non renseigné"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function CarteForcage({ forcage }: { forcage: Forcage }) {
  return (
    <article className="rounded-2xl border-2 border-error/50 bg-error-container/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-body-md font-semibold text-error">
          <ReportGmailerrorredOutlined style={{ fontSize: 18 }} />
          {forcage.contexte === "ouverture"
            ? "Phase ouverte sans décision"
            : "Phase clôturée sans décision"}
        </span>
        <span className="ml-auto text-label-md text-outline">{fmtInstant(forcage.le)}</span>
      </div>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Par {forcage.par_nom_cache ?? "—"} — le jalon n&apos;est pas franchi pour autant.
      </p>
      <p className="mt-2 text-body-sm text-on-surface whitespace-pre-wrap">{forcage.motif}</p>
    </article>
  );
}
