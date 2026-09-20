"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, type TabItem } from "@repo/ui/Tabs";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTiers,
  updateTiers,
  logActivite,
  TYPE_LABELS,
  type TiersDetail,
  type TiersUpdateInput,
} from "@/lib/tiers-api";
import {
  ContactsPanel,
  ContratsPanel,
  ServicesPanel,
  MissionsPanel,
  FacturesPanel,
  DocumentsPanel,
  EchangesPanel,
  ActivitesPanel,
} from "./Panels";
import { ArrowBackOutlined } from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tiers, setTiers] = useState<TiersDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TiersUpdateInput>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getTiers(Number(id))
      .then((t) => {
        setTiers(t);
        setForm({
          nom: t.nom, email: t.email ?? "", telephone: t.telephone ?? "",
          secteur_activite: t.secteur_activite ?? "", numero_contribuable: t.numero_contribuable ?? "",
          adresse_ville: t.adresse_ville ?? "",
        });
      })
      .catch(() => setError("Client introuvable."));
  }, [id]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateTiers(Number(id), form);
      setTiers(updated);
      logActivite(Number(id), "Informations générales mises à jour");
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-error">{error}</p></div>
      </DashboardShell>
    );
  }
  if (!tiers) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  const tabs: TabItem[] = [
    { key: "contacts", label: "Contacts", content: <ContactsPanel tiersId={tiers.id} tiersNom={tiers.nom} /> },
    { key: "contrats", label: "Contrats", content: <ContratsPanel tiersId={tiers.id} /> },
    { key: "services", label: "Services souscrits", content: <ServicesPanel tiersId={tiers.id} /> },
    { key: "missions", label: "Missions", content: <MissionsPanel tiersId={tiers.id} /> },
    { key: "factures", label: "Factures", content: <FacturesPanel tiersId={tiers.id} /> },
    { key: "documents", label: "Documents", content: <DocumentsPanel tiersId={tiers.id} /> },
    { key: "echanges", label: "Échanges", content: <EchangesPanel tiersId={tiers.id} /> },
    { key: "activites", label: "Actions réalisées", content: <ActivitesPanel tiersId={tiers.id} /> },
  ];

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-outline hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">{tiers.nom}</h1>
            <p className="text-body-sm text-on-surface-variant">{tiers.code} · {TYPE_LABELS[tiers.type]}</p>
          </div>
        </div>

        <form onSubmit={enregistrer} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5 space-y-4">
          <h2 className="text-body-md font-semibold text-on-surface">Informations générales</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom">
              <input className={FIELD} value={form.nom ?? ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </Field>
            <Field label="Secteur d'activité">
              <input className={FIELD} value={form.secteur_activite ?? ""} onChange={(e) => setForm({ ...form, secteur_activite: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input className={FIELD} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <input className={FIELD} value={form.telephone ?? ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </Field>
            <Field label="Ville">
              <input className={FIELD} value={form.adresse_ville ?? ""} onChange={(e) => setForm({ ...form, adresse_ville: e.target.value })} />
            </Field>
            <Field label="Numéro d'identification">
              <input className={FIELD} value={form.numero_contribuable ?? ""} onChange={(e) => setForm({ ...form, numero_contribuable: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {saved && <span className="text-body-sm text-member-active">Enregistré.</span>}
          </div>
        </form>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </DashboardShell>
  );
}
