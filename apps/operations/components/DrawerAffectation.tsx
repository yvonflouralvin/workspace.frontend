"use client";

import { useState } from "react";
import { CloseOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Affectation, type Planning, type Site } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const JOURS_SEMAINE = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
];

export type Repetition = "unique" | "hebdomadaire";

/** Le détail d'une affectation, et sa modification, dans un tiroir de droite.
 *
 *  Un tiroir plutôt qu'une modale : on garde la grille à l'œil pendant qu'on
 *  déplace un créneau, ce qui est exactement ce qu'on veut vérifier. */
export function DrawerAffectation({
  affectation,
  planning,
  sites,
  peutModifier,
  enCours,
  onClose,
  onEnregistrer,
  onSupprimer,
  onDefaireLot,
}: {
  affectation: Affectation;
  /** Absent pour une réservation de salle : sans planning, il n'y a pas de
   *  période sur laquelle répéter, et le choix ne s'affiche pas. */
  planning?: Planning | null;
  sites: Site[];
  peutModifier: boolean;
  enCours?: boolean;
  onClose: () => void;
  onEnregistrer: (corps: Record<string, unknown>, repetition: Repetition) => void;
  onSupprimer: () => void;
  onDefaireLot?: (lotId: string) => void;
}) {
  const dateDe = (iso: string) => iso.slice(0, 10);
  const heureDe = (iso: string) => iso.slice(11, 16);

  const [date, setDate] = useState(dateDe(affectation.debut));
  const [debut, setDebut] = useState(heureDe(affectation.debut));
  const [fin, setFin] = useState(heureDe(affectation.fin));
  const [siteId, setSiteId] = useState<number | "">(affectation.site_id ?? "");
  const [objet, setObjet] = useState(affectation.objet ?? "");
  const [edition, setEdition] = useState(false);
  const [repetition, setRepetition] = useState<Repetition>("unique");

  const finJour = fin <= debut ? jourSuivant(date) : date;
  const jourNomme = JOURS_SEMAINE[(new Date(`${date}T12:00:00`).getDay() + 6) % 7];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay animate-overlay-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[26rem] flex-col bg-surface-container-lowest shadow-drawer animate-drawer-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-soft px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-body-lg font-medium text-on-surface">
              {affectation.ressource}
            </h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {new Date(affectation.debut).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}{" "}
              · {heureCourte(affectation.debut)}–{heureCourte(affectation.fin)} ·{" "}
              {affectation.heures} h
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
          {affectation.en_chevauchement && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
              <WarningAmberOutlined style={{ fontSize: 16 }} className="mt-px flex-none" />
              <span>
                Cette affectation chevauche une autre.
                {affectation.motif_forcage && (
                  <span className="mt-1 block text-on-surface-variant">
                    Justification : {affectation.motif_forcage}
                  </span>
                )}
              </span>
            </p>
          )}

          {!edition ? (
            <dl className="flex flex-col gap-3">
              <Ligne terme="Site" valeur={affectation.site ?? "Aucun"} teinte={affectation.site_couleur} />
              <Ligne terme="Objet" valeur={affectation.objet ?? "—"} />
              <Ligne
                terme="Créneau"
                valeur={`${heureCourte(affectation.debut)} → ${heureCourte(affectation.fin)}`}
              />
              <div>
                <dt className="text-label-md text-on-surface-variant">Quand</dt>
                <dd className="mt-0.5 text-body-sm text-on-surface">
                  {affectation.lot_id
                    ? `Fait partie d'une série posée d'un seul geste — ce ${jourNomme} en est une occurrence.`
                    : `Le ${jourNomme} ${new Date(affectation.debut).toLocaleDateString("fr-FR")} seulement.`}
                  {affectation.lot_id && onDefaireLot && peutModifier && (
                    <button
                      type="button"
                      onClick={() => onDefaireLot(affectation.lot_id!)}
                      className="ml-2 text-label-md text-error"
                    >
                      Défaire toute la série
                    </button>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={CHAMP} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">De</span>
                  <input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} className={CHAMP} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">À</span>
                  <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} className={CHAMP} />
                </label>
              </div>
              {fin <= debut && (
                <p className="text-label-md text-on-surface-variant">
                  La fin précède le début : le créneau se termine le lendemain.
                </p>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Site</span>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : "")}
                  className={CHAMP}
                >
                  <option value="">Aucun</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Objet</span>
                <input value={objet} onChange={(e) => setObjet(e.target.value)} className={CHAMP} />
              </label>
              {/* Le même choix qu'à la création : une date précise, ou ce jour
                  de semaine sur toute la période du planning. Il manquait ici,
                  si bien qu'un créneau posé une fois ne pouvait plus devenir
                  hebdomadaire autrement qu'en le ressaisissant. */}
              {planning && (
                <div className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">Quand</span>
                  {([
                    ["unique", `Ce ${jourNomme} ${new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR")} seulement`],
                    ["hebdomadaire", `Tous les ${jourNomme}s de la période du planning`],
                  ] as const).map(([cle, libelle]) => (
                    <label
                      key={cle}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        repetition === cle
                          ? "border-primary bg-surface-container-low"
                          : "border-outline-soft hover:bg-surface-container-low"
                      }`}
                    >
                      <input
                        type="radio"
                        name="repetition-edition"
                        checked={repetition === cle}
                        onChange={() => setRepetition(cle)}
                        className="mt-0.5"
                      />
                      <span className="text-body-sm text-on-surface">{libelle}</span>
                    </label>
                  ))}
                  {repetition === "hebdomadaire" && (
                    <p className="text-label-md text-on-surface-variant">
                      Un créneau est ajouté pour chaque {jourNomme} entre le{" "}
                      {new Date(planning.debut).toLocaleDateString("fr-FR")} et le{" "}
                      {new Date(planning.fin).toLocaleDateString("fr-FR")}. Les dates déjà
                      couvertes sont laissées telles quelles, et celles en conflit sont
                      refusées sans annuler les autres.
                    </p>
                  )}
                </div>
              )}

              <p className="text-label-md text-on-surface-variant">
                {repetition === "unique"
                  ? "Cette modification ne touche que ce créneau, même s'il fait partie d'une série."
                  : "Ce créneau est modifié, puis la série est complétée à partir de lui."}
              </p>
            </div>
          )}
        </div>

        {peutModifier && (
          <footer className="flex justify-between gap-2 border-t border-outline-soft px-5 py-3">
            <button
              type="button"
              onClick={onSupprimer}
              className="h-9 rounded-lg px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-error"
            >
              Retirer
            </button>
            {!edition ? (
              <button
                type="button"
                onClick={() => setEdition(true)}
                className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button"
              >
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEdition(false)}
                  className="h-9 rounded-lg px-3 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() =>
                    onEnregistrer(
                      {
                        debut: `${date}T${debut}:00`,
                        fin: `${finJour}T${fin}:00`,
                        site_id: siteId === "" ? null : Number(siteId),
                        objet: objet.trim() || null,
                      },
                      repetition,
                    )
                  }
                  className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
                >
                  {enCours ? "…" : "Enregistrer"}
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Ligne({ terme, valeur, teinte }: { terme: string; valeur: string; teinte?: string | null }) {
  return (
    <div>
      <dt className="text-label-md text-on-surface-variant">{terme}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-body-sm text-on-surface">
        {teinte && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: teinte }} />}
        {valeur}
      </dd>
    </div>
  );
}

function jourSuivant(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
