"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  EventOutlined,
  InsightsOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchField } from "@repo/ui/SearchField";
import { Toast } from "@repo/ui/Toast";
import {
  TEINTES_TYPE,
  operationsApi,
  type Planning,
  type Ressource,
  type TypeDef,
  type TypePlanning,
} from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const LIBELLES_STATUT: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
  ARCHIVE: "Archivé",
};

export function PanneauListePlannings() {
  const { can } = usePermissions();
  const peutGerer = can("operations.plannings.manage");

  const [types, setTypes] = useState<TypeDef[]>([]);
  const [plannings, setPlannings] = useState<Planning[] | null>(null);
  const [typeChoisi, setTypeChoisi] = useState<string>("");
  const [recherche, setRecherche] = useState("");
  const [nouveau, setNouveau] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        operationsApi.types(),
        operationsApi.plannings(typeChoisi ? { type: typeChoisi } : {}),
      ]);
      setTypes(c.types);
      setPlannings(p);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les plannings.");
      setPlannings([]);
    }
  }, [typeChoisi]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return plannings ?? [];
    return (plannings ?? []).filter((p) => p.nom.toLowerCase().includes(q));
  }, [plannings, recherche]);

  return (
    <>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">Plannings</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              Un planning couvre une période et une nature de ressource. Les affectations
              posées en dehors de sa période sont refusées.
            </p>
          </div>
          {peutGerer && (
            <button
              type="button"
              onClick={() => setNouveau(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouveau planning
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SearchField
            value={recherche}
            onChange={setRecherche}
            placeholder="Rechercher un planning…"
            className="w-full sm:w-[260px]"
          />
          {/* Le filtre est alimenté par le CATALOGUE du backend : aucun type
              n'est écrit en dur ici. */}
          <div className="flex flex-wrap gap-1.5">
            <Pastille actif={!typeChoisi} onClick={() => setTypeChoisi("")}>
              Tous
            </Pastille>
            {types.map((t) => (
              <Pastille
                key={t.cle}
                actif={typeChoisi === t.cle}
                teinte={TEINTES_TYPE[t.cle]}
                onClick={() => setTypeChoisi(t.cle)}
              >
                {t.libelle_pluriel}
              </Pastille>
            ))}
          </div>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {plannings === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : filtres.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <EventOutlined style={{ fontSize: 28 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucun planning.</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Un planning se crée pour une période et une nature de ressource — par exemple
              « Gardiennage août » pour des prestations.
            </p>
          </div>
        ) : (
          /* Une liste, pas des cartes : on compare des plannings entre eux —
             période, volume, conflits — et une colonne se compare d'un coup
             d'œil là où une carte oblige à relire chaque bloc. */
          <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-soft bg-surface-row-alt">
                  <Th>Planning</Th>
                  <Th>Type</Th>
                  <Th>Période</Th>
                  <Th align="right">Affectations</Th>
                  <Th>Statut</Th>
                  <Th align="right">Rapport</Th>
                </tr>
              </thead>
              <tbody>
                {filtres.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-b-0 hover:bg-surface-container-low">
                    <td className="px-4 py-2.5">
                      <Link href={`/plannings/${p.id}`} className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-4 w-1 flex-none rounded-full"
                          style={{ backgroundColor: TEINTES_TYPE[p.type] }}
                        />
                        <span className="truncate text-body-sm font-medium text-on-surface">{p.nom}</span>
                        {p.chevauchements_count > 0 && (
                          <span
                            className="inline-flex flex-none items-center gap-0.5 text-label-sm text-error"
                            title={`${p.chevauchements_count} créneau(x) en chevauchement`}
                          >
                            <WarningAmberOutlined style={{ fontSize: 13 }} />
                            {p.chevauchements_count}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                      {types.find((t) => t.cle === p.type)?.libelle ?? p.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-body-sm text-on-surface-variant">
                      {new Date(p.debut).toLocaleDateString("fr-FR")} → {new Date(p.fin).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface">
                      {p.affectations_count}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                        {LIBELLES_STATUT[p.statut] ?? p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/plannings/${p.id}/rapport`}
                        className="inline-flex items-center gap-1 text-label-md text-primary hover:underline"
                      >
                        <InsightsOutlined style={{ fontSize: 15 }} />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nouveau && (
        <FormulairePlanning
          types={types}
          onClose={() => setNouveau(false)}
          onDone={(nom) => {
            setNouveau(false);
            setToast(`« ${nom} » créé.`);
            void charger();
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-2 text-label-sm uppercase tracking-wide text-outline ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Pastille({
  actif,
  teinte,
  onClick,
  children,
}: {
  actif: boolean;
  teinte?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-lg border px-3 text-body-sm transition-colors ${
        actif
          ? "border-primary bg-surface-container-low text-on-surface"
          : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {teinte && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: teinte }} />
        )}
        {children}
      </span>
    </button>
  );
}

function FormulairePlanning({
  types,
  onClose,
  onDone,
}: {
  types: TypeDef[];
  onClose: () => void;
  onDone: (nom: string) => void;
}) {
  const aujourdhui = new Date();
  const dansUnMois = new Date(aujourdhui);
  dansUnMois.setMonth(dansUnMois.getMonth() + 1);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [type, setType] = useState<TypePlanning>(types[0]?.cle ?? "PRESTATION");
  const [nom, setNom] = useState("");
  const [debut, setDebut] = useState(iso(aujourdhui));
  const [fin, setFin] = useState(iso(dansUnMois));
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Vide = aucune restriction. C'est le défaut, et c'est ce qu'on veut :
  // un planning créé sans y penser ne doit pas tout refuser.
  const [restreint, setRestreint] = useState(false);
  const [choisies, setChoisies] = useState<number[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);

  useEffect(() => {
    setChoisies([]);
    void (async () => {
      try {
        const r = await operationsApi.ressources({ type, actif: true, page: 1 });
        setRessources(r.items);
      } catch {
        setRessources([]);
      }
    })();
  }, [type]);

  async function envoyer() {
    if (!nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    if (fin < debut) {
      setErreur("La fin de la période doit suivre son début.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      await operationsApi.creerPlanning({
        type, nom: nom.trim(), debut, fin,
        ressource_ids: restreint ? choisies : [],
      });
      onDone(nom.trim());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[30rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">Nouveau planning</h2>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Nature planifiée</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypePlanning)}
              className={CHAMP}
            >
              {types.map((t) => (
                <option key={t.cle} value={t.cle}>
                  {t.libelle} — {t.description}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Nom *</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. : Gardiennage août"
              className={CHAMP}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Applicable du</span>
              <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">au</span>
              <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={CHAMP} />
            </label>
          </div>
          <p className="text-label-md text-on-surface-variant">
            Aucune affectation ne pourra être posée hors de cette période. Elle reste
            modifiable tant qu&apos;aucune affectation ne tomberait dehors.
          </p>
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
            {enCours ? "…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
