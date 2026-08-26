"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AddOutlined,
  CheckCircleOutlined,
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  ErrorOutlineOutlined,
  HourglassEmptyOutlined,
  RefreshOutlined,
  StarOutlineOutlined,
} from "@mui/icons-material";

import { api, type Domaine } from "@/app/lib/api";

/** Les adresses d'un site : le sous-domaine de la plateforme, et ceux du client.
 *
 *  **Rien n'est routé avant deux preuves** — que le domaine est bien à vous, et
 *  qu'il pointe bien chez nous. La première est une sécurité : sans elle,
 *  n'importe qui attacherait le domaine d'un autre et obtiendrait un certificat
 *  valide pour lui. La seconde est une économie : demander un certificat pour un
 *  domaine qui ne pointe pas ici garantit un échec, et l'autorité qui les émet
 *  limite le nombre d'échecs par heure.
 *
 *  Les instructions DNS viennent du SERVEUR, mot pour mot. Les recopier ici
 *  ferait mentir l'écran le jour où les adresses de la plateforme changent.
 */

const ETATS: Record<Domaine["etat"], { libelle: string; teinte: string; Icone: typeof CheckCircleOutlined }> = {
  ACTIF: { libelle: "Actif", teinte: "text-secondary", Icone: CheckCircleOutlined },
  VERIFIE: { libelle: "Vérifié", teinte: "text-secondary", Icone: CheckCircleOutlined },
  EN_ATTENTE: { libelle: "En attente du DNS", teinte: "text-outline", Icone: HourglassEmptyOutlined },
  ERREUR: { libelle: "Ne répond plus", teinte: "text-error", Icone: ErrorOutlineOutlined },
};

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

export function Domaines({ siteId, peutGerer }: { siteId: number; peutGerer: boolean }) {
  const [domaines, setDomaines] = useState<Domaine[] | null>(null);
  const [hote, setHote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | "ajout" | null>(null);
  const [ouvert, setOuvert] = useState<number | null>(null);

  const charger = useCallback(async () => {
    try {
      setDomaines(await api.domaines(siteId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setDomaines([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(cle: number | "ajout", action: () => Promise<unknown>) {
    setBusy(cle);
    setErreur(null);
    try {
      await action();
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <h2 className="text-body-md font-semibold text-on-surface">Adresses du site</h2>
      <p className="mt-0.5 max-w-[68ch] text-body-sm text-on-surface-variant">
        Le site répond toujours sur son adresse provisoire. Branchez en plus le nom de domaine
        que vous avez acheté : il faudra poser deux enregistrements chez votre fournisseur, et
        la propagation prend de quelques minutes à une heure.
      </p>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {domaines === null ? (
        <p className="mt-3 text-body-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline rounded-xl border border-outline-soft">
          {domaines.map((d) => {
            const etat = ETATS[d.etat];
            return (
              <li key={d.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-body-sm text-on-surface">
                      {d.hote}
                      {d.principal && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm text-primary">
                          adresse canonique
                        </span>
                      )}
                      {d.type === "PLATEFORME" && (
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                          provisoire
                        </span>
                      )}
                    </span>
                    <span className={`flex items-center gap-1 text-label-md ${etat.teinte}`}>
                      <etat.Icone style={{ fontSize: 14 }} />
                      {etat.libelle}
                      {d.derniere_erreur && d.etat !== "ACTIF" ? ` — ${d.derniere_erreur}` : ""}
                    </span>
                  </span>

                  {d.type === "CUSTOM" && peutGerer && (
                    <>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => setOuvert(ouvert === d.id ? null : d.id)}
                        className="h-8 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                      >
                        {ouvert === d.id ? "Masquer" : "Instructions"}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        title="Relancer les contrôles DNS"
                        aria-label="Relancer les contrôles DNS"
                        onClick={() => void agir(d.id, () => api.verifierDomaine(d.id))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                      >
                        <RefreshOutlined style={{ fontSize: 16 }} />
                      </button>
                      {!d.principal && (
                        <button
                          type="button"
                          disabled={busy !== null || d.etat !== "ACTIF"}
                          title={
                            d.etat === "ACTIF"
                              ? "Faire de cette adresse la canonique"
                              : "Un domaine qui ne répond pas encore ne peut pas être canonique."
                          }
                          aria-label="Rendre canonique"
                          onClick={() => void agir(d.id, () => api.domainePrincipal(d.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                        >
                          <StarOutlineOutlined style={{ fontSize: 16 }} />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy !== null}
                        aria-label={`Détacher ${d.hote}`}
                        onClick={() => void agir(d.id, () => api.detacherDomaine(d.id))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-outline transition-colors hover:text-error disabled:opacity-40"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                      </button>
                    </>
                  )}
                </div>

                {ouvert === d.id && d.instructions.length > 0 && (
                  <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                    <p className="mb-2 text-label-md text-on-surface-variant">
                      À poser chez votre fournisseur de domaine. Le TXT prouve que le domaine
                      est le vôtre ; le CNAME (ou le A) le fait pointer ici.
                    </p>
                    <div className="space-y-2">
                      {d.instructions.map((i, n) => (
                        <div key={n} className="rounded-lg bg-surface-container-lowest p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-label-sm text-on-surface">
                              {i.type}
                            </span>
                            <code className="min-w-0 flex-1 select-all truncate text-label-md text-on-surface">
                              {i.nom}
                            </code>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="min-w-0 flex-1 select-all break-all text-label-md text-on-surface-variant">
                              {i.valeur}
                            </code>
                            <button
                              type="button"
                              aria-label="Copier la valeur"
                              onClick={() => void navigator.clipboard?.writeText(i.valeur)}
                              className="shrink-0 text-outline transition-colors hover:text-primary"
                            >
                              <ContentCopyOutlined style={{ fontSize: 15 }} />
                            </button>
                          </div>
                          <p className="mt-0.5 text-label-sm text-outline">{i.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {peutGerer && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${CHAMP} max-w-[20rem]`}
            placeholder="exemple.cd"
            value={hote}
            onChange={(e) => setHote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !hote.trim()) return;
              void agir("ajout", async () => {
                const cree = await api.attacherDomaine(siteId, hote.trim());
                setHote("");
                setOuvert(cree.id);
              });
            }}
          />
          <button
            type="button"
            disabled={busy !== null || !hote.trim()}
            onClick={() =>
              void agir("ajout", async () => {
                const cree = await api.attacherDomaine(siteId, hote.trim());
                setHote("");
                setOuvert(cree.id);
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            <AddOutlined style={{ fontSize: 17 }} />
            Brancher un domaine
          </button>
        </div>
      )}
    </section>
  );
}
