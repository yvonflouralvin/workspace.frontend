"use client";

import { useEffect, useMemo, useState } from "react";
import {
  operationsApi,
  type Groupe,
  type Planning,
  type Ressource,
  type Site,
} from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Poser une affectation : une ressource, ou un groupe entier.
 *
 *  Le choix des ressources est filtré sur le TYPE du planning — proposer un
 *  véhicule dans un planning de prestations laisserait l'utilisateur découvrir
 *  le refus après coup. */
export function FormulaireAffectation({
  planning,
  jour,
  enCours,
  onClose,
  onSubmit,
  onLot,
}: {
  planning: Planning;
  jour: Date;
  enCours?: boolean;
  onClose: () => void;
  onSubmit: (corps: Record<string, unknown>) => void;
  onLot: (corps: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<"une" | "groupe">("une");
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [ressourceId, setRessourceId] = useState<number | "">("");
  const [groupeId, setGroupeId] = useState<number | "">("");
  const [siteId, setSiteId] = useState<number | "">("");
  const [objet, setObjet] = useState("");
  const [date, setDate] = useState(() => isoLocal(jour));
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("16:00");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [r, g, s] = await Promise.all([
          operationsApi.ressources({ type: planning.type, actif: true, page: 1 }),
          operationsApi.groupes(planning.type),
          operationsApi.sites(true),
        ]);
        setRessources(r.items);
        setGroupes(g.filter((x) => x.active));
        setSites(s);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      }
    })();
  }, [planning.type]);

  /** Une prestation de nuit se termine le lendemain. Plutôt que d'exiger deux
   *  dates, on déduit : une fin antérieure au début appartient au jour suivant. */
  const bornes = useMemo(() => {
    const d = `${date}T${debut}:00`;
    const finJour = fin <= debut ? jourSuivant(date) : date;
    return { debut: d, fin: `${finJour}T${fin}:00`, chevaucheMinuit: fin <= debut };
  }, [date, debut, fin]);

  function envoyer() {
    if (mode === "une" && !ressourceId) {
      setErreur("Choisissez une ressource.");
      return;
    }
    if (mode === "groupe" && !groupeId) {
      setErreur("Choisissez un groupe.");
      return;
    }
    setErreur(null);
    const commun = {
      debut: bornes.debut,
      fin: bornes.fin,
      site_id: siteId === "" ? null : Number(siteId),
      objet: objet.trim() || null,
    };
    if (mode === "une") onSubmit({ ...commun, ressource_id: Number(ressourceId) });
    else onLot({ ...commun, groupe_id: Number(groupeId) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[32rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">Nouvelle affectation</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{planning.nom}</p>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}

          <div className="flex rounded-lg border border-outline-soft p-0.5">
            {(["une", "groupe"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-8 flex-1 rounded-md text-body-sm transition-colors ${
                  mode === m
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {m === "une" ? "Une ressource" : "Un groupe"}
              </button>
            ))}
          </div>

          {mode === "une" ? (
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Ressource *</span>
              <select
                value={ressourceId}
                onChange={(e) => setRessourceId(e.target.value ? Number(e.target.value) : "")}
                className={CHAMP}
              >
                <option value="">Choisir…</option>
                {ressources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom_affiche}
                    {r.categorie ? ` — ${r.categorie}` : ""}
                  </option>
                ))}
              </select>
              {ressources.length === 0 && (
                <span className="text-label-md text-on-surface-variant">
                  Aucune ressource de ce type. Créez-en depuis « Ressources ».
                </span>
              )}
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Groupe *</span>
              <select
                value={groupeId}
                onChange={(e) => setGroupeId(e.target.value ? Number(e.target.value) : "")}
                className={CHAMP}
              >
                <option value="">Choisir…</option>
                {groupes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nom} ({g.membres.length} membre{g.membres.length > 1 ? "s" : ""})
                  </option>
                ))}
              </select>
              <span className="text-label-md text-on-surface-variant">
                Une affectation est créée par membre actif. Celles qui entrent en conflit
                sont refusées sans annuler les autres.
              </span>
            </label>
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
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>

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
          {bornes.chevaucheMinuit && (
            <p className="text-label-md text-on-surface-variant">
              La fin précède le début : la prestation se termine le lendemain.
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Objet</span>
            <input
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex. : ronde de nuit, cours de mathématiques"
              className={CHAMP}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={envoyer}
            className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors disabled:opacity-50"
          >
            {enCours ? "…" : "Affecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Date locale au format ISO court — `toISOString()` bascule en UTC et décale
 *  d'un jour selon le fuseau. */
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function jourSuivant(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}
