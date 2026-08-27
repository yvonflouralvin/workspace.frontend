"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowBackOutlined, ReceiptLongOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import {
  STATUTS_COMMANDE,
  api,
  montant,
  type Abonne,
  type ClientBoutique,
  type Commande,
  type StatutCommande,
} from "@/app/lib/api";

const ONGLETS = [
  { cle: "commandes", libelle: "Commandes" },
  { cle: "clients", libelle: "Clients" },
  { cle: "abonnes", libelle: "Abonnés" },
] as const;

const TEINTE: Record<StatutCommande, string> = {
  RECUE: "bg-primary/10 text-primary",
  PAYEE: "bg-secondary/15 text-secondary",
  EXPEDIEE: "bg-secondary/15 text-secondary",
  LIVREE: "bg-surface-container text-on-surface-variant",
  ANNULEE: "bg-error-container/40 text-error",
};

/** Ce que la boutique a produit : commandes, clients, abonnés.
 *
 *  Trois listes au même endroit parce qu'elles répondent à la même question du
 *  matin — « qu'est-ce qui s'est passé cette nuit ? ». Trois écrans séparés
 *  feraient ouvrir trois onglets pour y répondre.
 */
export default function VentesPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = Number(params.siteId);
  const { can } = usePermissions();
  const peutGerer = can("website.boutique.manage");

  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]["cle"]>("commandes");
  const [commandes, setCommandes] = useState<Commande[] | null>(null);
  const [clients, setClients] = useState<ClientBoutique[]>([]);
  const [abonnes, setAbonnes] = useState<Abonne[]>([]);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const [c, cl, ab] = await Promise.all([
        api.commandes(siteId),
        api.clientsBoutique(siteId),
        api.abonnes(siteId),
      ]);
      setCommandes(c);
      setClients(cl);
      setAbonnes(ab);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setCommandes([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function changerStatut(commande: Commande, statut: string) {
    try {
      await api.changerStatutCommande(commande.id, statut);
      setToast(`${commande.reference} — ${STATUTS_COMMANDE[statut as StatutCommande]}`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Changement impossible.");
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Retour au site
        </Link>

        <h1 className="mt-2 font-display text-headline-sm text-on-surface">Ventes</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Le paiement en ligne n&apos;est pas encore branché : une commande arrive
          « reçue », et c&apos;est vous qui la faites avancer.
        </p>

        <div className="mt-4 flex gap-1.5">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle)}
              className={`h-9 rounded-lg px-3 text-label-lg transition-colors ${
                onglet === o.cle
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {o.libelle} (
              {o.cle === "commandes"
                ? (commandes ?? []).length
                : o.cle === "clients"
                  ? clients.length
                  : abonnes.length}
              )
            </button>
          ))}
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {onglet === "commandes" &&
          (commandes === null ? (
            <p className="mt-4 text-body-sm text-on-surface-variant">Chargement…</p>
          ) : commandes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-outline-soft p-8 text-center">
              <ReceiptLongOutlined style={{ fontSize: 32 }} className="text-outline" />
              <p className="mt-2 text-body-sm text-on-surface-variant">
                Aucune commande. Elles arriveront ici dès qu&apos;un visiteur en passera une.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
              {commandes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOuvert(ouvert === c.id ? null : c.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span className="font-mono text-body-sm text-on-surface">{c.reference}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm text-on-surface">{c.nom}</span>
                      <span className="block truncate text-label-md text-outline">
                        {c.email} · {new Date(c.created_at).toLocaleString("fr-FR")}
                      </span>
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface">
                      {montant(c.total_centimes, c.devise)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-label-sm ${TEINTE[c.statut]}`}>
                      {c.statut_libelle}
                    </span>
                  </button>

                  {ouvert === c.id && (
                    <div className="border-t border-outline-soft bg-surface-container-low px-4 py-3">
                      <ul className="space-y-1">
                        {c.lignes.map((l, i) => (
                          <li key={i} className="flex justify-between gap-3 text-body-sm">
                            <span className="text-on-surface-variant">
                              {l.produit_nom}
                              {l.variante_libelle ? ` — ${l.variante_libelle}` : ""} × {l.quantite}
                            </span>
                            <span className="text-on-surface">
                              {montant(l.total_centimes, c.devise)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {(c.telephone || c.adresse_livraison || c.note) && (
                        <p className="mt-3 whitespace-pre-line text-body-sm text-on-surface-variant">
                          {[c.telephone, c.adresse_livraison, c.note].filter(Boolean).join("\n")}
                        </p>
                      )}

                      {peutGerer && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Object.entries(STATUTS_COMMANDE).map(([cle, libelle]) => (
                            <button
                              key={cle}
                              type="button"
                              disabled={c.statut === cle}
                              onClick={() => void changerStatut(c, cle)}
                              className="h-8 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
                            >
                              {libelle}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {onglet === "clients" && (
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {clients.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-on-surface">
                    {c.nom ?? c.email}
                  </span>
                  <span className="block truncate text-label-md text-outline">{c.email}</span>
                </span>
                <span className="text-label-md text-outline">
                  {c.commandes} commande{c.commandes > 1 ? "s" : ""}
                </span>
              </li>
            ))}
            {clients.length === 0 && (
              <li className="px-4 py-6 text-center text-body-sm text-on-surface-variant">
                Aucun compte client. Un visiteur peut commander sans en créer un.
              </li>
            )}
          </ul>
        )}

        {onglet === "abonnes" && (
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {abonnes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                  {a.email}
                </span>
                <span className="text-label-md text-outline">
                  {a.source ?? "—"} · {new Date(a.created_at).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
            {abonnes.length === 0 && (
              <li className="px-4 py-6 text-center text-body-sm text-on-surface-variant">
                Personne ne s&apos;est encore abonné. Posez un bloc « Abonnement » sur une page.
              </li>
            )}
          </ul>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
