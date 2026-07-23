"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { EditClientDrawer } from "@/components/EditClientDrawer";
import { Tabs } from "@repo/ui/Tabs";
import { Avatar } from "@repo/ui/Avatar";
import { useDevise } from "@/components/DeviseProvider";
import { STATUT_CLASS, STATUT_LABEL } from "@/lib/commande-ui";
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
  const { format } = useDevise();
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
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
        <span className="w-[150px] flex-none">Code</span>
        <span className="flex-1 min-w-0">Statut</span>
        <span className="w-[100px] flex-none">Date</span>
        <span className="w-[170px] flex-none text-right">Montant</span>
      </div>
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/commandes/${c.id}`}
          className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
        >
          <span className="w-full md:w-[150px] flex-none truncate font-mono text-label-md font-medium text-primary">
            {c.code}
          </span>
          <span className="md:flex-1 md:min-w-0">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_CLASS[c.statut]}`}>
              {STATUT_LABEL[c.statut]}
            </span>
          </span>
          <span className="md:w-[100px] flex-none whitespace-nowrap font-mono text-label-md text-on-surface-variant">
            {c.date_commande ?? "—"}
          </span>
          <span className="md:w-[170px] flex-none md:text-right whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
            {format(c.montant_total)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ClientFacturesTab({ clientId }: { clientId: number }) {
  const { format } = useDevise();
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
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
        <span className="w-[150px] flex-none">Code</span>
        <span className="flex-1 min-w-0">Statut</span>
        <span className="w-[100px] flex-none">Échéance</span>
        <span className="w-[170px] flex-none text-right">Montant</span>
      </div>
      {items.map((f) => (
        <div
          key={f.id}
          className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0"
        >
          <span className="w-full md:w-[150px] flex-none truncate font-mono text-label-md text-on-surface-variant">
            {f.code}
          </span>
          <span className="md:flex-1 md:min-w-0 text-body-sm text-on-surface-variant">{f.statut}</span>
          <span className="md:w-[100px] flex-none whitespace-nowrap font-mono text-label-md text-on-surface-variant">
            {f.date_echeance ?? "—"}
          </span>
          <span className="md:w-[170px] flex-none md:text-right whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
            {format(f.montant_total)}
          </span>
        </div>
      ))}
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
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
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
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-6 space-y-4">
              <div className="flex items-start gap-4 flex-wrap">
                <Avatar name={client.nom} letters={1} size={48} color="var(--color-secondary)" />
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-headline-md text-on-surface truncate">
                    {client.nom}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 mt-1 text-[11px] font-semibold ${
                      client.crm_client_id
                        ? "bg-role-admin-container text-role-admin"
                        : "bg-role-member-container text-role-member"
                    }`}
                  >
                    {client.crm_client_id ? "Lié à une fiche Tiers" : "Non lié à Tiers"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage && (
                    <button
                      onClick={() => setEditing(true)}
                      title="Modifier les informations"
                      className="inline-flex items-center justify-center w-11 h-11 md:w-[38px] md:h-[38px] rounded-lg border border-outline-soft text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 18 }} />
                    </button>
                  )}
                  <button
                    onClick={openTiers}
                    disabled={linking}
                    className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
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
