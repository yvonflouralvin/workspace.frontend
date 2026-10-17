"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { getDossier, updateDossier, type Dossier } from "@/lib/bfm-fiscal-api";
import { getTiers, searchTiers } from "@/lib/tiers-api";
import {
  ObligationsPanel,
  EcheancesPanel,
  DeclarationsPanel,
  CorrespondancesPanel,
  PaiementsFiscauxPanel,
  PenalitesPanel,
  ControlesFiscauxPanel,
  type PanelProps,
} from "./Panels";
import { AddOutlined, ArrowBackOutlined, ExpandMoreOutlined } from "@mui/icons-material";

interface TiersBrief { id: number; code: string; nom: string }

/** L'ordre des sections est celui du menu « Ajouter » : ce qu'on vient
 *  d'ajouter se retrouve là où on l'a cherché. */
const SECTIONS: { cle: string; titre: string; ajout: string; Panel: (p: PanelProps) => React.ReactNode }[] = [
  { cle: "obligations", titre: "Obligations", ajout: "Obligation", Panel: ObligationsPanel },
  { cle: "echeances", titre: "Échéances", ajout: "Échéance", Panel: EcheancesPanel },
  { cle: "declarations", titre: "Déclarations", ajout: "Déclaration", Panel: DeclarationsPanel },
  { cle: "correspondances", titre: "Correspondances", ajout: "Correspondance", Panel: CorrespondancesPanel },
  { cle: "paiements", titre: "Paiements", ajout: "Paiement", Panel: PaiementsFiscauxPanel },
  { cle: "penalites", titre: "Pénalités", ajout: "Pénalité", Panel: PenalitesPanel },
  { cle: "controles", titre: "Contrôles fiscaux", ajout: "Contrôle fiscal", Panel: ControlesFiscauxPanel },
];

function MenuAjouter({ onChoisir, disabled }: { onChoisir: (cle: string) => void; disabled: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function dehors(e: MouseEvent) {
      if (ancre.current && !ancre.current.contains(e.target as Node)) setOuvert(false);
    }
    function echap(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  return (
    <div ref={ancre} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
      >
        <AddOutlined style={{ fontSize: 16 }} />
        Ajouter
        <ExpandMoreOutlined style={{ fontSize: 16 }} />
      </button>
      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-outline-soft bg-surface-container-lowest shadow-modal py-1"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.cle}
              type="button"
              role="menuitem"
              onClick={() => {
                setOuvert(false);
                onChoisir(s.cle);
              }}
              className="w-full px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {s.ajout}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DossierFiscalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canManage = can("business_firm_missions.missions.manage");

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [clientNom, setClientNom] = useState<string | null>(null);
  const [editionClient, setEditionClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Quelle section doit ouvrir son tiroir de création. Remis à null dès que la
  // section l'a pris, pour que rechoisir la même entrée rouvre bien le tiroir.
  const [aCreer, setACreer] = useState<string | null>(null);

  useEffect(() => {
    getDossier(Number(id))
      .then(setDossier)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur inattendue"));
  }, [id]);

  useEffect(() => {
    if (!dossier?.tiers_id) {
      setClientNom(null);
      return;
    }
    let vivant = true;
    getTiers(dossier.tiers_id)
      .then((t) => vivant && setClientNom(`${t.code} — ${t.nom}`))
      // Un client supprimé ne doit pas vider l'écran du dossier.
      .catch(() => vivant && setClientNom(null));
    return () => {
      vivant = false;
    };
  }, [dossier?.tiers_id]);

  // L'enregistrement de la description est différé : l'éditeur émet à chaque
  // frappe, et un appel par caractère saturerait le réseau pour rien.
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enregistrerDescription = useCallback(
    (json: string) => {
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => {
        updateDossier(Number(id), { description_rich: json }).catch((err) =>
          setError(err instanceof Error ? err.message : "Enregistrement impossible"),
        );
      }, 800);
    },
    [id],
  );
  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  if (error && !dossier) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-error">{error}</p></div>
      </DashboardShell>
    );
  }
  if (!dossier) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <Link href="/fiscal" className="text-outline hover:text-on-surface transition-colors mt-1">
              <ArrowBackOutlined style={{ fontSize: 20 }} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-headline-lg text-on-surface">{dossier.nom}</h1>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                {editionClient && canManage ? (
                  <div className="w-72">
                    <SearchSelect<TiersBrief>
                      fetchOptions={(q) => searchTiers(q)}
                      value={dossier.tiers_id}
                      onChange={async (value) => {
                        setEditionClient(false);
                        setDossier(await updateDossier(dossier.id, { tiers_id: (value as number) ?? null }));
                      }}
                      getOptionLabel={(t) => `${t.code} — ${t.nom}`}
                      initialLabel={clientNom ?? ""}
                      placeholder="Rechercher un client…"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => setEditionClient(true)}
                    className="text-body-md text-on-surface-variant hover:text-on-surface disabled:hover:text-on-surface-variant transition-colors"
                  >
                    {clientNom ?? (dossier.tiers_id ? `Client #${dossier.tiers_id}` : "Aucun client — en choisir un")}
                  </button>
                )}
              </div>
            </div>
          </div>
          <MenuAjouter onChoisir={setACreer} disabled={!canManage} />
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <div>
          <p className="block text-label-sm uppercase text-outline mb-2">Description</p>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <RichTextEditor
              value={dossier.description_rich}
              fallbackText={dossier.notes}
              editable={canManage}
              placeholder="Objet de la mission, périmètre, interlocuteurs, points d'attention…"
              className="min-h-[12rem]"
              onChange={canManage ? enregistrerDescription : undefined}
            />
          </div>
        </div>

        {SECTIONS.map(({ cle, titre, Panel }) => (
          <section key={cle} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-on-surface">{titre}</h2>
            <Panel
              dossierId={dossier.id}
              demandeNouveau={aCreer === cle}
              onNouveauPris={() => setACreer(null)}
            />
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
