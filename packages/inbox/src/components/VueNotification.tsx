"use client";

/** Une notification, en grand. Même contenu que le détail de la cloche, mais
 *  retrouvé des jours plus tard par la recherche — c'est tout l'intérêt. */
import { OpenInNewOutlined } from "@mui/icons-material";
import type { InAppNotification } from "@repo/notifications/types/notification";

export function VueNotification({ notification }: { notification: InAppNotification }) {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-lowest px-6 py-3.5">
        <h2 className="font-display text-headline-sm text-on-surface">{notification.title}</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          {nomDeLApp(notification.type_key)} ·{" "}
          {new Date(notification.created_at).toLocaleString("fr-FR", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-[760px] space-y-4">
          <p className="whitespace-pre-wrap text-body-md text-on-surface">
            {notification.body || "—"}
          </p>
          {notification.link && (
            <a
              href={notification.link}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-soft px-3 py-1.5 text-label-md text-primary hover:bg-surface-container-low transition-colors"
            >
              <OpenInNewOutlined style={{ fontSize: 16 }} />
              Ouvrir
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Le type porte son application en préfixe (`agent.mission_terminee`). Le
 *  serveur ne sait pas la nommer joliment — il ne connaît que le nom des
 *  TYPES —, donc c'est ici, et le repli est la clé elle-même. */
const NOMS: Record<string, string> = {
  agent: "Assistant",
  inbox: "Boîte de réception",
  projects: "Projets",
  hosto: "Hôpital",
  hr: "RH",
  ventes: "Facturation",
  comptabilite: "Comptabilité",
  approval_flows: "Circuits d'approbation",
  business_firm_missions: "Business Firm",
  audit_missions: "Audit",
  stock: "Stock",
  tiers: "Tiers",
  website: "Site web",
  operations: "Exploitation",
  academique: "Académique",
  isp: "ISP",
  sgr: "SGR",
  documents: "Documents",
  dashboard: "Rapports",
  auth: "Comptes",
};

export function nomDeLApp(typeKey: string): string {
  const cle = (typeKey || "").split(".")[0] ?? "";
  return NOMS[cle] ?? cle;
}
