"use client";

import { CloseOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Reservation } from "@/lib/operations-api";

const LIBELLE_STATUT: Record<string, { mot: string; classe: string }> = {
  DEMANDEE: { mot: "En attente de validation", classe: "bg-surface-container text-on-surface-variant" },
  ACCEPTEE: { mot: "Acceptée", classe: "bg-secondary/15 text-secondary" },
  REFUSEE: { mot: "Refusée", classe: "bg-error-container text-error" },
};

/** Le détail d'une réservation de salle, dans un tiroir de droite.
 *
 *  Un tiroir plutôt qu'une action directe : cliquer sur un créneau, c'est
 *  vouloir SAVOIR ce qu'il est — pas le supprimer. Les décisions se prennent
 *  ensuite, en connaissance de cause, depuis ce même écran.
 */
export function DrawerReservation({
  reservation,
  peutValider,
  peutRetirer,
  enCours,
  onClose,
  onAccepter,
  onRefuser,
  onRetirer,
}: {
  reservation: Reservation;
  peutValider: boolean;
  /** Le demandeur peut retirer la sienne ; un validateur, n'importe laquelle. */
  peutRetirer: boolean;
  enCours?: boolean;
  onClose: () => void;
  onAccepter: () => void;
  onRefuser: () => void;
  onRetirer: () => void;
}) {
  const statut = LIBELLE_STATUT[reservation.statut] ?? {
    mot: reservation.statut,
    classe: "bg-surface-container text-on-surface-variant",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay animate-overlay-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[26rem] flex-col bg-surface-container-lowest shadow-drawer animate-drawer-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-soft px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-body-lg font-medium text-on-surface">
              {reservation.salle ?? "Réservation"}
            </h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {new Date(reservation.debut).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}{" "}
              · {heureCourte(reservation.debut)}–{heureCourte(reservation.fin)} ·{" "}
              {reservation.heures} h
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <CloseOutlined style={{ fontSize: 18 }} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-label-md ${statut.classe}`}>
            {statut.mot}
          </span>

          {reservation.en_chevauchement && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
              <WarningAmberOutlined style={{ fontSize: 16 }} className="mt-px flex-none" />
              <span>
                Cette réservation chevauche une autre.
                {reservation.motif_forcage && (
                  <span className="mt-1 block text-on-surface-variant">
                    Justification : {reservation.motif_forcage}
                  </span>
                )}
              </span>
            </p>
          )}

          <dl className="mt-4 flex flex-col gap-3">
            <Ligne terme="Objet" valeur={reservation.objet ?? "—"} />
            <Ligne terme="Demandé par" valeur={reservation.demandeur ?? "—"} />
            <Ligne
              terme="Capacité de la salle"
              valeur={reservation.capacite ? `${reservation.capacite} places` : "—"}
            />
            {reservation.decide_le && (
              <Ligne
                terme="Décidé le"
                valeur={new Date(reservation.decide_le).toLocaleString("fr-FR")}
              />
            )}
            {reservation.motif_decision && (
              <Ligne terme="Motif de la décision" valeur={reservation.motif_decision} />
            )}
          </dl>

          {reservation.statut === "DEMANDEE" && !peutValider && (
            <p className="mt-4 text-label-md text-on-surface-variant">
              Cette demande attend une validation. Elle n&apos;occupe pas encore le créneau.
            </p>
          )}
        </div>

        {(peutValider || peutRetirer) && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-soft px-5 py-3">
            {peutRetirer ? (
              <button
                type="button"
                disabled={enCours}
                onClick={onRetirer}
                className="h-9 rounded-lg px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-error disabled:opacity-50"
              >
                Retirer
              </button>
            ) : (
              <span />
            )}

            {/* Les décisions n'ont de sens que sur une demande en attente :
                accepter une réservation déjà acceptée ne dit rien. */}
            {peutValider && reservation.statut === "DEMANDEE" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={enCours}
                  onClick={onRefuser}
                  className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
                >
                  Refuser
                </button>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={onAccepter}
                  className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
                >
                  Accepter
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div>
      <dt className="text-label-md text-on-surface-variant">{terme}</dt>
      <dd className="mt-0.5 text-body-sm text-on-surface">{valeur}</dd>
    </div>
  );
}
