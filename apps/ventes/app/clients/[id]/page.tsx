"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { EditClientDrawer } from "@/components/EditClientDrawer";
import { Tabs } from "@repo/ui/Tabs";
import {
  getClient,
  ensureClientTiersLink,
  listCommandes,
  listFactures,
  type Client,
  type Commande,
  type Facture,
} from "@/lib/ventes-api";
import {
  ArrowBackOutlined,
  OpenInNewOutlined,
  EditOutlined,
  EmailOutlined,
  PhoneOutlined,
  PlaceOutlined,
} from "@mui/icons-material";

const TIERS_DOMAIN = process.env.NEXT_PUBLIC_AUTH_API_TIERS_DOMAIN ?? "http://localhost:3009";

function formatMontant(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 text-body-sm">
      <span className="text-on-surface-variant">{icon}</span>
      <span className="text-on-surface-variant w-24 shrink-0">{label}</span>
      <span className="text-on-surface">{value || "—"}</span>
    </div>
  );
}

function ClientCommandesTab({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCommandes({ client_id: clientId, page: 1, page_size: 50 })
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0)
    return <p className="text-body-sm text-on-surface-variant">Aucune commande pour ce client.</p>;

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-on-surface-variant">
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-5 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b border-outline-variant last:border-0">
              <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">{c.code}</td>
              <td className="px-5 py-3 text-on-surface-variant">{c.statut}</td>
              <td className="px-5 py-3 text-on-surface-variant">{c.date_commande ?? "—"}</td>
              <td className="px-5 py-3 text-on-surface text-right tabular-nums">{formatMontant(c.montant_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientFacturesTab({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFactures({ client_id: clientId, page: 1, page_size: 50 })
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0)
    return <p className="text-body-sm text-on-surface-variant">Aucune facture pour ce client.</p>;

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-on-surface-variant">
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-5 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 font-medium">Échéance</th>
            <th className="px-5 py-3 font-medium text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-b border-outline-variant last:border-0">
              <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">{f.code}</td>
              <td className="px-5 py-3 text-on-surface-variant">{f.statut}</td>
              <td className="px-5 py-3 text-on-surface-variant">{f.date_echeance ?? "—"}</td>
              <td className="px-5 py-3 text-on-surface text-right tabular-nums">{formatMontant(f.montant_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canView = can("ventes.clients.view");
  const canManage = can("ventes.clients.manage");

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getClient(Number(id))
      .then(setClient)
      .catch(() => setError("Client introuvable."))
      .finally(() => setLoading(false));
  }, [id, canView]);

  function openTiers() {
    if (!client || linking) return;
    const win = window.open("", "_blank");
    setLinking(true);
    (async () => {
      try {
        let cid = client.crm_client_id;
        if (!cid) {
          const r = await ensureClientTiersLink(client.id);
          cid = r.crm_client_id;
          setClient({ ...client, crm_client_id: cid });
        }
        if (win) win.location.href = `${TIERS_DOMAIN}/tiers/${cid}`;
      } catch (e) {
        if (win) win.close();
        setError(e instanceof Error ? e.message : "Impossible d'ouvrir la fiche Tiers.");
      } finally {
        setLinking(false);
      }
    })();
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux clients
        </Link>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les clients.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && client && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-headline-md font-display text-on-surface">{client.nom}</h1>
                    {client.crm_client_id && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-tertiary/10 text-tertiary">
                        Lié à Tiers
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage && (
                    <button
                      onClick={() => setEditing(true)}
                      title="Modifier les informations"
                      className="inline-flex items-center p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 18 }} />
                    </button>
                  )}
                  <button
                    onClick={openTiers}
                    disabled={linking}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    <OpenInNewOutlined style={{ fontSize: 16 }} />
                    {linking ? "Ouverture…" : "Fiche dans Tiers"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={<EmailOutlined style={{ fontSize: 18 }} />} label="Email" value={client.email} />
                <InfoRow icon={<PhoneOutlined style={{ fontSize: 18 }} />} label="Téléphone" value={client.telephone} />
                <InfoRow icon={<PlaceOutlined style={{ fontSize: 18 }} />} label="Ville" value={client.adresse_ville} />
              </div>
            </div>

            <Tabs
              tabs={[
                { key: "commandes", label: "Commandes", content: <ClientCommandesTab clientId={client.id} /> },
                { key: "factures", label: "Factures", content: <ClientFacturesTab clientId={client.id} /> },
              ]}
            />

            {editing && (
              <EditClientDrawer
                client={client}
                onClose={() => setEditing(false)}
                onSaved={setClient}
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
