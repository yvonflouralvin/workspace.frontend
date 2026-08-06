"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  EventOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchField } from "@repo/ui/SearchField";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  TEINTES_TYPE,
  operationsApi,
  type Planning,
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

export default function PlanningsPage() {
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
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
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
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtres.map((p) => (
              <Link
                key={p.id}
                href={`/plannings/${p.id}`}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 transition-colors hover:border-outline-variant"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 h-9 w-1.5 flex-none rounded-full"
                    style={{ backgroundColor: TEINTES_TYPE[p.type] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-body-md font-medium text-on-surface">
                      {p.nom}
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                        {LIBELLES_STATUT[p.statut] ?? p.statut}
                      </span>
                    </p>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">
                      Du {new Date(p.debut).toLocaleDateString("fr-FR")} au{" "}
                      {new Date(p.fin).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-label-md text-outline">
                      <span>
                        {p.affectations_count} affectation
                        {p.affectations_count > 1 ? "s" : ""}
                      </span>
                      {p.chevauchements_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-error">
                          <WarningAmberOutlined style={{ fontSize: 14 }} />
                          {p.chevauchements_count} en chevauchement
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
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
    </DashboardShell>
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
      await operationsApi.creerPlanning({ type, nom: nom.trim(), debut, fin });
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
