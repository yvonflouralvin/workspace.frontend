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
  Inventory2Outlined,
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
  onInfo?: () => void;
  onEdit?: () => void;
  locked?: boolean;
  lockTitle?: string;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {onInfo && (
        <button
          onClick={onInfo}
          title="Informations"
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <InfoOutlined style={{ fontSize: 16 }} />
        </button>
      )}
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

const CARD = "rounded-2xl border border-outline-soft bg-surface-container-lowest p-5";
const CARD_LABEL = "text-label-sm uppercase text-outline";

function CardHeader({
  label,
  onInfo,
  onEdit,
  locked,
  lockTitle,
}: {
  label: string;
  onInfo?: () => void;
  onEdit?: () => void;
  locked?: boolean;
  lockTitle?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3.5">
      <span className={CARD_LABEL}>{label}</span>
      {(onInfo || onEdit || locked) && (
        <span className="-mr-1.5">
          <IconActions onInfo={onInfo} onEdit={onEdit} locked={locked} lockTitle={lockTitle} />
        </span>
      )}
    </div>
  );
}

/**
 * Corps de la fiche produit — présentation unifiée du design (Informations,
 * Prix & TVA, Liens, Catégories). L'édition passe par les drawers existants,
 * champ par champ, et respecte les verrous des produits publiés par une autre app.
 */
function FicheProduit({
  produit,
  canManage,
  baseDevise,
  devises,
  tvaDefaut,
  onSaved,
  linking,
  onOpenStock,
}: {
  produit: Produit;
  canManage: boolean;
  baseDevise: string;
  devises: DeviseEntry[];
  tvaDefaut: number | string | null;
  onSaved: (produit: Produit) => void;
  linking: boolean;
  onOpenStock: () => void;
}) {
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingCat, setEditingCat] = useState(false);
  const [showCatInfo, setShowCatInfo] = useState(false);
  const [editingPrix, setEditingPrix] = useState(false);
  const [showPrixInfo, setShowPrixInfo] = useState(false);
  const [editingTva, setEditingTva] = useState(false);
  const [showTvaInfo, setShowTvaInfo] = useState(false);

  const owner = produit.owner_app_key;
  const lockedFields = produit.locked_fields ?? [];
  const isLocked = (...fields: string[]) => !!owner && fields.some((f) => lockedFields.includes(f));
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
    <div className="space-y-4">
      {/* Informations */}
      <div className={CARD}>
        <CardHeader
          label="Informations"
          onEdit={canManage ? () => setEditingInfo(true) : undefined}
          locked={isLocked("nom", "description", "unite")}
          lockTitle={lockTitle}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom" value={produit.nom} />
          <Field label="Unité" value={produit.unite || "—"} />
          <div className="md:col-span-2">
            <Field label="Description" value={produit.description || "—"} />
          </div>
        </div>
      </div>

      {/* Prix & TVA · Liens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD}>
          <CardHeader label="Prix & TVA" />
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-label-md text-outline mb-0.5">Prix de vente</p>
                <p className="text-body-md text-on-surface tabular-nums break-words">{prixBase}</p>
                {prixNum !== null && devises.length > 0 && (
                  <p className="text-label-md text-on-surface-variant tabular-nums mt-0.5 break-words">
                    {conversions(prixNum, devises)}
                  </p>
                )}
              </div>
              <span className="-mr-1.5 mt-1">
                <IconActions
                  onInfo={() => setShowPrixInfo(true)}
                  onEdit={canManage ? () => setEditingPrix(true) : undefined}
                  locked={isLocked("prix_vente")}
                  lockTitle={lockTitle}
                />
              </span>
            </div>
            <div className="flex items-start gap-3 pt-3.5 border-t border-hairline">
              <div className="flex-1 min-w-0">
                <p className="text-label-md text-outline mb-0.5">TVA applicable</p>
                <p className="text-body-md text-on-surface">
                  {produit.tva_applicable
                    ? `Oui${tvaDefaut !== null && tvaDefaut !== "" ? ` (${tvaDefaut} %)` : ""}`
                    : "Non"}
                </p>
                {produit.tva_applicable && tvaSubline && (
                  <p className="text-label-md text-on-surface-variant tabular-nums mt-0.5 break-words">
                    {tvaSubline}
                  </p>
                )}
              </div>
              <span className="-mr-1.5 mt-1">
                <IconActions
                  onInfo={() => setShowTvaInfo(true)}
                  onEdit={canManage ? () => setEditingTva(true) : undefined}
                  locked={isLocked("tva_applicable")}
                  lockTitle={lockTitle}
                />
              </span>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <CardHeader label="Liens" />
          <button
            onClick={onOpenStock}
            disabled={linking}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-outline-soft hover:bg-surface-container-low transition-colors disabled:opacity-50 text-left"
          >
            <Inventory2Outlined style={{ fontSize: 18 }} className="text-on-surface-variant flex-none" />
            <span className="flex-1 min-w-0 text-body-sm text-on-surface">Article Stock</span>
            <span className="flex items-center gap-1 text-label-md font-semibold text-primary flex-none">
              {produit.stock_item_id ? "Lié" : "Créer le lien"}
              <OpenInNewOutlined style={{ fontSize: 14 }} />
            </span>
          </button>
          <p className="text-label-md text-outline mt-2">
            Le stock est décrémenté à la validation de commande.
          </p>
        </div>
      </div>

      {/* Catégories */}
      <div className={CARD}>
        <CardHeader
          label="Catégories"
          onInfo={() => setShowCatInfo(true)}
          onEdit={canManage ? () => setEditingCat(true) : undefined}
          locked={isLocked("categorie_id")}
          lockTitle={lockTitle}
        />
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

      {editingInfo && (
        <EditProduitInfoDrawer produit={produit} onClose={() => setEditingInfo(false)} onSaved={onSaved} />
      )}
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-label-md text-outline mb-0.5">{label}</p>
      <p className="text-body-md text-on-surface break-words">{value}</p>
    </div>
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

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-headline-md font-display text-on-surface break-words">{produit.nom}</h1>
              {produit.stock_item_id && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-tertiary/10 text-tertiary">
                  Lié à Stock
                </span>
              )}
              {produit.owner_app_key && <LockedBadge appLabel={produit.owner_app_key} />}
            </div>

            <FicheProduit
              produit={produit}
              canManage={canManage}
              baseDevise={baseDevise}
              devises={devises}
              tvaDefaut={tvaDefaut}
              onSaved={setProduit}
              linking={linking}
              onOpenStock={openStock}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
