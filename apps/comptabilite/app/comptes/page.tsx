"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import { AIDE_COMPTES } from "@/components/aide-contenu";
import {
  listComptes,
  createCompte,
  chargerReferentiel,
  listReferentiels,
  toggleCompteActif,
  TYPE_COMPTE_LABELS,
  type Compte,
  type TypeCompte,
  type SensNormal,
  type Referentiel,
} from "@/lib/compta-api";
import { AddOutlined, DownloadOutlined, TuneOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function ComptesPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [referentiels, setReferentiels] = useState<Referentiel[]>([]);
  const [referentielChoisi, setReferentielChoisi] = useState("");
  const [ajout, setAjout] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [numero, setNumero] = useState("");
  const [libelle, setLibelle] = useState("");
  const [classe, setClasse] = useState("6");
  const [typeCompte, setTypeCompte] = useState<TypeCompte>("CHARGE");
  const [sensNormal, setSensNormal] = useState<SensNormal>("DEBIT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listComptes().then(setComptes);
  }

  useEffect(() => {
    reload();
    listReferentiels().then((list) => {
      setReferentiels(list);
      const ohada = list.find((r) => r.code === "ohada");
      if (ohada) setReferentielChoisi(String(ohada.id));
      else if (list[0]) setReferentielChoisi(String(list[0].id));
    });
  }, []);

  async function basculerActif(c: Compte) {
    await toggleCompteActif(c);
    reload();
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createCompte({
        numero: numero.trim(),
        libelle: libelle.trim(),
        classe: Number(classe),
        type_compte: typeCompte,
        sens_normal: sensNormal,
      });
      setNumero("");
      setLibelle("");
      setAjout(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function charger() {
    if (!referentielChoisi) return;
    setChargement(true);
    try {
      await chargerReferentiel(Number(referentielChoisi));
      reload();
    } finally {
      setChargement(false);
    }
  }

  const columns = useMemo<DataListColumn<Compte>[]>(
    () => [
      { key: "numero", header: "Numéro", render: (c) => <span className="font-mono">{c.numero}</span> },
      { key: "libelle", header: "Libellé", render: (c) => c.libelle },
      { key: "classe", header: "Classe", render: (c) => `Classe ${c.classe}` },
      { key: "type", header: "Type", render: (c) => TYPE_COMPTE_LABELS[c.type_compte] },
      { key: "sens", header: "Sens normal", render: (c) => (c.sens_normal === "DEBIT" ? "Débit" : "Crédit") },
      { key: "lettrable", header: "Lettrable", render: (c) => (c.lettrable ? "Oui" : "—") },
      {
        key: "statut",
        header: "Statut",
        render: (c) => (
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${c.actif ? "bg-member-active-container text-member-active" : "bg-surface-container text-on-surface-variant"}`}>
            {c.actif ? "Actif" : "Désactivé"}
          </span>
        ),
      },
      ...(canManage
        ? [
            {
              key: "actions",
              header: "",
              render: (c: Compte) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    basculerActif(c);
                  }}
                  className="text-label-sm font-semibold text-primary hover:text-primary-container transition-colors"
                >
                  {c.actif ? "Désactiver" : "Réactiver"}
                </button>
              ),
            } satisfies DataListColumn<Compte>,
          ]
        : []),
    ],
    [canManage],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Plan comptable</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Chargez un référentiel (OHADA, PCG français, personnalisé…), librement personnalisable ensuite.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <select
                value={referentielChoisi}
                onChange={(e) => setReferentielChoisi(e.target.value)}
                className="rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
              >
                {referentiels.length === 0 && <option value="">Aucun référentiel</option>}
                {referentiels.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}{r.systeme ? "" : " (perso)"} — {r.nombre_comptes} comptes
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={charger}
                disabled={chargement || !referentielChoisi}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                <DownloadOutlined style={{ fontSize: 16 }} />
                {chargement ? "Chargement…" : "Charger"}
              </button>
              <Link
                href="/parametres/referentiels"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <TuneOutlined style={{ fontSize: 16 }} />
                Référentiels
              </Link>
              {!ajout && (
                <button
                  type="button"
                  onClick={() => setAjout(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
                >
                  <AddOutlined style={{ fontSize: 16 }} />
                  Nouveau compte
                </button>
              )}
            </div>
          )}
        </div>

        {ajout && (
          <form
            onSubmit={ajouter}
            className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
          >
            {error && <p className="text-body-sm text-error w-full">{error}</p>}
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Numéro</span>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} className={FIELD} required autoFocus />
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Libellé</span>
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={`${FIELD} w-full`} required />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Classe</span>
              <select value={classe} onChange={(e) => setClasse(e.target.value)} className={FIELD}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Type</span>
              <select value={typeCompte} onChange={(e) => setTypeCompte(e.target.value as TypeCompte)} className={FIELD}>
                {Object.entries(TYPE_COMPTE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Sens normal</span>
              <select value={sensNormal} onChange={(e) => setSensNormal(e.target.value as SensNormal)} className={FIELD}>
                <option value="DEBIT">Débit</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Créer"}
            </button>
          </form>
        )}

        {comptes === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={comptes}
            columns={columns}
            getRowKey={(c) => c.id}
            searchText={(c) => `${c.numero} ${c.libelle}`}
            searchPlaceholder="Rechercher un compte…"
            pageSize={20}
            emptyMessage="Aucun compte — chargez un référentiel pour démarrer."
          />
        )}
      </div>
      <AideFlottante titre={AIDE_COMPTES.titre}>{AIDE_COMPTES.contenu}</AideFlottante>
    </DashboardShell>
  );
}
