"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { LockedBadge, LockedBanner } from "@repo/ui/LockedBadge";
import { EditProduitPrixDrawer } from "@/components/EditProduitPrixDrawer";
import { EditProduitTvaDrawer } from "@/components/EditProduitTvaDrawer";
import { EditProduitInfoDrawer } from "@/components/EditProduitInfoDrawer";
import { EditProduitCategorieDrawer } from "@/components/EditProduitCategorieDrawer";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  getProduit,
  getFacturationConfig,
  ensureProduitStockLink,
  type Produit,
  type DeviseEntry,
} from "@/lib/ventes-api";
import {
  ArrowBackOutlined,
  OpenInNewOutlined,
  EditOutlined,
  InfoOutlined,
  LockOutlined,
} from "@mui/icons-material";

const STOCK_DOMAIN = process.env.NEXT_PUBLIC_AUTH_API_STOCK_DOMAIN ?? "http://localhost:3010";

const PRIX_INFO =
  "Le prix de vente est maintenu dans l'application Ventes. Les prix dans les autres devises sont " +
  "calculés à partir des taux définis dans Paramètres › Devise.";

const TVA_INFO =
  "Indique si la TVA s'applique à ce produit. Lorsqu'elle est activée, le montant est calculé " +
  "sur le prix de vente de base, avec le taux par défaut défini dans Paramètres › TVA.";

const CAT_INFO =
  "La catégorie regroupe les produits similaires. Gérez la liste des catégories depuis " +
  "Produits › Catégories.";

function formatNum(v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function conversions(montant: number, devises: DeviseEntry[]): string {
  return devises.map((d) => `${formatNum(montant * Number(d.taux))} ${d.code}`).join(" · ");
}

function IconActions({
  onInfo,
  onEdit,
  locked,
  lockTitle,
}: {
  onInfo: () => void;
  onEdit?: () => void;
  locked?: boolean;
  lockTitle?: string;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={onInfo}
        title="Informations"
        className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
      >
        <InfoOutlined style={{ fontSize: 16 }} />
      </button>
      {locked ? (
        <span title={lockTitle} className="p-1.5 flex items-center text-on-surface-variant/50">
          <LockOutlined style={{ fontSize: 16 }} />
        </span>
      ) : onEdit ? (
        <button
          onClick={onEdit}
          title="Modifier"
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
        >
          <EditOutlined style={{ fontSize: 16 }} />
        </button>
      ) : null}
    </div>
  );
}

function GeneralTab({
  produit,
  canManage,
  baseDevise,
  devises,
  tvaDefaut,
  onSaved,
}: {
  produit: Produit;
  canManage: boolean;
  baseDevise: string;
  devises: DeviseEntry[];
  tvaDefaut: number | string | null;
  onSaved: (produit: Produit) => void;
}) {
  const [editingCat, setEditingCat] = useState(false);
  const [showCatInfo, setShowCatInfo] = useState(false);
  const [editingPrix, setEditingPrix] = useState(false);
  const [showPrixInfo, setShowPrixInfo] = useState(false);
  const [editingTva, setEditingTva] = useState(false);
  const [showTvaInfo, setShowTvaInfo] = useState(false);

  const owner = produit.owner_app_key;
  const lockedFields = produit.locked_fields ?? [];
  const isLocked = (f: string) => !!owner && lockedFields.includes(f);
  const lockTitle = owner ? `Champ géré par « ${owner} »` : undefined;

  const prixNum =
    produit.prix_vente === null || produit.prix_vente === undefined || produit.prix_vente === ""
      ? null
      : Number(produit.prix_vente);
  const prixBase = prixNum === null ? "—" : `${formatNum(prixNum)}${baseDevise ? ` ${baseDevise}` : ""}`;

  const tvaTauxNum = tvaDefaut === null || tvaDefaut === "" ? null : Number(tvaDefaut);
  const montantTva = prixNum !== null && tvaTauxNum !== null ? (prixNum * tvaTauxNum) / 100 : null;
  const tvaSubline =
    montantTva === null
      ? null
      : [
          `${formatNum(montantTva)}${baseDevise ? ` ${baseDevise}` : ""}`,
          ...(devises.length > 0 ? [conversions(montantTva, devises)] : []),
        ].join(" · ");

  return (
    <>
      <p className="text-label-sm uppercase text-outline mb-2">Catégories</p>
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline mb-5">
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-label-md text-on-surface-variant w-40 shrink-0">Catégories</span>
          <div className="flex-1 min-w-0">
            {produit.categories.length ? (
              <div className="flex flex-wrap gap-1.5">
                {produit.categories.map((c) => (
                  <span
                    key={c.id}
                    className="text-label-md text-on-surface bg-surface-container border border-outline-variant rounded-full px-2.5 py-1"
                  >
                    {c.nom}
                  </span>
                ))}
              </div>
            ) : (
              <span className="block text-body-md text-on-surface">—</span>
            )}
          </div>
          <IconActions
            onInfo={() => setShowCatInfo(true)}
            onEdit={canManage ? () => setEditingCat(true) : undefined}
            locked={isLocked("categorie_id")}
            lockTitle={lockTitle}
          />
        </div>

      </div>

      <p className="text-label-sm uppercase text-outline mb-2">Prix &amp; TVA</p>
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-label-md text-on-surface-variant w-40 shrink-0">Prix de vente</span>
          <div className="flex-1 min-w-0">
            <span className="block text-body-md text-on-surface tabular-nums break-words">{prixBase}</span>
            {prixNum !== null && devises.length > 0 && (
              <span className="block text-label-md text-on-surface-variant tabular-nums mt-0.5 break-words">
                {conversions(prixNum, devises)}
              </span>
            )}
          </div>
          <IconActions
            onInfo={() => setShowPrixInfo(true)}
            onEdit={canManage ? () => setEditingPrix(true) : undefined}
            locked={isLocked("prix_vente")}
            lockTitle={lockTitle}
          />
        </div>

        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-label-md text-on-surface-variant w-40 shrink-0">TVA applicable</span>
          <div className="flex-1 min-w-0">
            <span className="block text-body-md text-on-surface">
              {produit.tva_applicable
                ? `Oui${tvaDefaut !== null && tvaDefaut !== "" ? ` (${tvaDefaut} %)` : ""}`
                : "Non"}
            </span>
            {produit.tva_applicable && tvaSubline && (
              <span className="block text-label-md text-on-surface-variant tabular-nums mt-0.5 break-words">
                {tvaSubline}
              </span>
            )}
          </div>
          <IconActions
            onInfo={() => setShowTvaInfo(true)}
            onEdit={canManage ? () => setEditingTva(true) : undefined}
            locked={isLocked("tva_applicable")}
            lockTitle={lockTitle}
          />
        </div>
      </div>

      {showCatInfo && (
        <RightDrawer title="Catégorie" onClose={() => setShowCatInfo(false)}>
          <p className="text-body-md text-on-surface-variant leading-relaxed">{CAT_INFO}</p>
        </RightDrawer>
      )}
      {editingCat && (
        <EditProduitCategorieDrawer
          produit={produit}
          onClose={() => setEditingCat(false)}
          onSaved={onSaved}
        />
      )}
      {showPrixInfo && (
        <RightDrawer title="Prix de vente" onClose={() => setShowPrixInfo(false)}>
          <p className="text-body-md text-on-surface-variant leading-relaxed">{PRIX_INFO}</p>
        </RightDrawer>
      )}
      {showTvaInfo && (
        <RightDrawer title="TVA applicable" onClose={() => setShowTvaInfo(false)}>
          <p className="text-body-md text-on-surface-variant leading-relaxed">{TVA_INFO}</p>
        </RightDrawer>
      )}
      {editingPrix && (
        <EditProduitPrixDrawer
          produit={produit}
          baseDevise={baseDevise}
          devises={devises}
          onClose={() => setEditingPrix(false)}
          onSaved={onSaved}
        />
      )}
      {editingTva && (
        <EditProduitTvaDrawer
          produit={produit}
          tvaDefaut={tvaDefaut}
          baseDevise={baseDevise}
          onClose={() => setEditingTva(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

export default function ProduitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canView = can("ventes.produits.view");
  const canManage = can("ventes.produits.manage");

  const [produit, setProduit] = useState<Produit | null>(null);
  const [baseDevise, setBaseDevise] = useState("");
  const [devises, setDevises] = useState<DeviseEntry[]>([]);
  const [tvaDefaut, setTvaDefaut] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getFacturationConfig()
      .then((c) => { setBaseDevise(c.devise_base); setDevises(c.devises); setTvaDefaut(c.tva_taux_defaut); })
      .catch(() => {});
    getProduit(Number(id))
      .then(setProduit)
      .catch(() => setError("Produit introuvable."))
      .finally(() => setLoading(false));
  }, [id, canView]);

  function openStock() {
    if (!produit || linking) return;
    const win = window.open("", "_blank");
    setLinking(true);
    (async () => {
      try {
        let sid = produit.stock_item_id;
        if (!sid) {
          const r = await ensureProduitStockLink(produit.id);
          sid = r.stock_item_id;
          setProduit({ ...produit, stock_item_id: sid });
        }
        if (win) win.location.href = `${STOCK_DOMAIN}/items/${sid}`;
      } catch (e) {
        if (win) win.close();
        setError(e instanceof Error ? e.message : "Impossible d'ouvrir la fiche Stock.");
      } finally {
        setLinking(false);
      }
    })();
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
        <Link
          href="/produits"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux produits
        </Link>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les produits.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && produit && (
          <>
            {produit.owner_app_key && <LockedBanner appLabel={produit.owner_app_key} />}

            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-headline-md font-display text-on-surface">{produit.nom}</h1>
                    {produit.stock_item_id && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-tertiary/10 text-tertiary">
                        Lié à Stock
                      </span>
                    )}
                    {produit.owner_app_key && <LockedBadge appLabel={produit.owner_app_key} />}
                  </div>
                  {produit.description && (
                    <p className="text-body-sm text-on-surface-variant mt-1">{produit.description}</p>
                  )}
                  {produit.unite && (
                    <p className="text-body-sm text-on-surface-variant mt-1">Unité : {produit.unite}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage &&
                    (produit.owner_app_key &&
                    ["nom", "description", "unite"].some((f) => (produit.locked_fields ?? []).includes(f)) ? (
                      <span
                        title={`Informations gérées par « ${produit.owner_app_key} »`}
                        className="inline-flex items-center p-2 rounded-xl border border-outline-variant text-on-surface-variant/50"
                      >
                        <LockOutlined style={{ fontSize: 18 }} />
                      </span>
                    ) : (
                      <button
                        onClick={() => setEditingInfo(true)}
                        title="Modifier les informations"
                        className="inline-flex items-center p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                      >
                        <EditOutlined style={{ fontSize: 18 }} />
                      </button>
                    ))}
                  <button
                    onClick={openStock}
                    disabled={linking}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    <OpenInNewOutlined style={{ fontSize: 16 }} />
                    {linking ? "Ouverture…" : "Fiche dans Stock"}
                  </button>
                </div>
              </div>
            </div>

            <GeneralTab
              produit={produit}
              canManage={canManage}
              baseDevise={baseDevise}
              devises={devises}
              tvaDefaut={tvaDefaut}
              onSaved={setProduit}
            />

            {editingInfo && (
              <EditProduitInfoDrawer
                produit={produit}
                onClose={() => setEditingInfo(false)}
                onSaved={setProduit}
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
