"use client";

import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Promotion, type SessionEvaluation } from "@/app/lib/api";
import { PromotionProvider } from "./promotion-context";
import { SECTIONS, sectionPour } from "./sections";

/** La coque d'une promotion : son identité, sa session de travail, ses onglets.
 *
 *  La **session d'évaluation** vit ici et nulle part ailleurs. Chaque écran en
 *  a besoin — cotation, examens, grille, recours — et chacun la redemanderait
 *  sinon : l'agent la reposerait à chaque onglet, et deux écrans finiraient par
 *  montrer deux sessions différentes.
 */
export default function PromotionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ promotionId: string }>;
}) {
  const { promotionId } = use(params);
  const id = Number(promotionId);
  const pathname = usePathname();
  const { can } = usePermissions();
  const contexte = useContexte();

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [sessions, setSessions] = useState<SessionEvaluation[]>([]);
  const [session, setSession] = useState("NORMALE");
  const [tic, setTic] = useState(0);

  // La promotion se lit PAR SON IDENTIFIANT, pas dans la liste de
  // l'établissement mémorisé côté navigateur : les deux ne concordent pas
  // toujours, et l'en-tête restait alors vide sur une promotion parfaitement
  // valide. C'est elle qui dit à quel établissement elle appartient.
  useEffect(() => {
    void api
      .promotion(id)
      .then(setPromotion)
      .catch(() => setPromotion(null));
  }, [id, tic]);

  useEffect(() => {
    void api.sessions().then(setSessions).catch(() => {});
  }, []);

  const recharger = useCallback(() => setTic((t) => t + 1), []);
  const courante = sectionPour(pathname, id);
  const visibles = SECTIONS.filter((s) => !s.permission || can(s.permission));

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1152px] p-4 md:p-8">
        <Link
          href="/promotions"
          className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Promotions
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-headline-md text-on-surface">
              {promotion?.libelle ?? "Promotion"}
            </h1>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {promotion ? `${promotion.unite_libelle} · ${promotion.annee_libelle}` : ""}
            </p>
          </div>

          {/* La session de travail. Elle n'a de sens que sur les écrans
              d'évaluation, mais la poser ici évite qu'ils divergent. */}
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            Session
            <select
              aria-label="Session d'évaluation"
              className="h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.cle} value={s.cle}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav className="mt-5 mb-5 flex items-center gap-1 overflow-x-auto border-b border-outline-soft">
          {visibles.map((s) => {
            const actif = s.cle === courante.cle;
            return (
              <Link
                key={s.cle}
                href={`/promotions/${id}${s.chemin}`}
                className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
                  actif
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="inline-flex items-center">{s.icone}</span>
                {s.libelle}
              </Link>
            );
          })}
        </nav>

        <PromotionProvider
          value={{
            promotionId: id,
            promotion,
            sessions,
            session,
            setSession,
            // Celui de la PROMOTION, pas celui du sélecteur : les écrans qui
            // chargent un catalogue (frais, critères de défense) interrogeraient
            // sinon un autre établissement que celui qu'ils affichent.
            etablissementId: promotion?.etablissement_id ?? contexte.etablissement?.id ?? null,
            recharger,
          }}
        >
          {children}
        </PromotionProvider>
      </div>
    </DashboardShell>
  );
}
