"use client";

import { useCallback, useEffect, useState } from "react";
import { EventOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { DashboardShell } from "@/components/DashboardShell";
import { sgrApi, type RendezVous, type Responsable } from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<string, string> = {
  DEMANDE: "bg-surface-container text-on-surface-variant",
  CONFIRME: "bg-secondary/15 text-secondary",
  REFUSE: "bg-error-container/50 text-error",
  ANNULE: "bg-surface-container text-outline",
};

const LIBELLE: Record<string, string> = {
  DEMANDE: "En attente",
  CONFIRME: "Confirmé",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
};

/** Les rendez-vous, des deux côtés du guichet.
 *
 *  Le candidat demande et suit ; celui qui traite confirme ou refuse. Un seul
 *  écran, parce que c'est la même liste vue de deux places — et que dupliquer
 *  la page ferait diverger l'affichage des états.
 */
export default function RendezVousPage() {
  const { can } = usePermissions();
  const user = useSessionStore((s) => s.user);
  const traite = can("sgr.rendezvous.manage");

  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [demandes, setDemandes] = useState<RendezVous[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [ouvert, setOuvert] = useState(false);
  const [responsable, setResponsable] = useState<number | "">("");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [souhaite, setSouhaite] = useState("");

  const [reponses, setReponses] = useState<Record<number, { fixe: string; texte: string }>>({});

  const charger = useCallback(async () => {
    try {
      const [rs, ds] = await Promise.all([sgrApi.responsables(), sgrApi.rendezVous()]);
      setResponsables(rs);
      setDemandes(ds);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setDemandes([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function demander() {
    if (!responsable || !objet.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await sgrApi.demanderRendezVous({
        responsable_id: responsable,
        nom: user?.username ?? "—",
        email: user?.email ?? "",
        objet: objet.trim(),
        message: message.trim() || null,
        souhaite_le: souhaite ? new Date(souhaite).toISOString() : null,
      });
      setOuvert(false);
      setObjet("");
      setMessage("");
      setSouhaite("");
      setToast("Demande envoyée. Réponse sous 48 heures ouvrables.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Demande impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function repondre(rdv: RendezVous, etat: string) {
    const saisie = reponses[rdv.id] ?? { fixe: "", texte: "" };
    setBusy(true);
    setErreur(null);
    try {
      await sgrApi.repondreRendezVous(rdv.id, {
        etat,
        fixe_le: saisie.fixe ? new Date(saisie.fixe).toISOString() : null,
        reponse: saisie.texte.trim() || null,
      });
      setToast(etat === "CONFIRME" ? "Rendez-vous confirmé." : "Demande refusée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réponse impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Rendez-vous</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              {traite
                ? "Les demandes adressées aux responsables du Secrétariat."
                : "Demandez un rendez-vous avec un responsable du Secrétariat. Réponse sous 48 heures ouvrables."}
            </p>
          </div>
          {!traite && (
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
            >
              <EventOutlined style={{ fontSize: 16 }} />
              Demander
            </button>
          )}
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {ouvert && (
          <section className="mt-4 space-y-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <select
              aria-label="Responsable"
              className={CHAMP}
              value={responsable}
              onChange={(e) => setResponsable(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Choisissez un responsable…</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fonction}
                </option>
              ))}
            </select>
            <input
              className={CHAMP}
              placeholder="Objet de la demande *"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
            />
            <input
              type="datetime-local"
              aria-label="Date souhaitée"
              className={CHAMP}
              value={souhaite}
              onChange={(e) => setSouhaite(e.target.value)}
            />
            <textarea
              rows={3}
              aria-label="Message"
              className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
              placeholder="Précisez votre demande (facultatif)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !responsable || !objet.trim()}
              onClick={demander}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              Envoyer la demande
            </button>
          </section>
        )}

        {!traite && responsables.length > 0 && (
          <section className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-label-sm uppercase text-outline">Responsables disponibles</p>
            <ul className="mt-2 space-y-1">
              {responsables.map((r) => (
                <li key={r.id} className="text-body-sm text-on-surface">
                  {r.fonction}
                  <span className="text-on-surface-variant"> — {r.nom}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {demandes === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : demandes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <EventOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucune demande pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {demandes.map((rdv) => (
              <article
                key={rdv.id}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-on-surface">{rdv.objet}</p>
                    <p className="text-label-md text-outline">
                      {rdv.responsable_nom}
                      {traite && ` · ${rdv.nom} (${rdv.email})`}
                      {rdv.souhaite_le &&
                        ` · souhaité le ${new Date(rdv.souhaite_le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-label-md ${TEINTE[rdv.etat]}`}
                  >
                    {LIBELLE[rdv.etat] ?? rdv.etat}
                  </span>
                </div>

                {rdv.message && (
                  <p className="mt-2 text-body-sm text-on-surface-variant">{rdv.message}</p>
                )}

                {rdv.fixe_le && (
                  <p className="mt-2 text-body-sm text-secondary">
                    Fixé au{" "}
                    {new Date(rdv.fixe_le).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {rdv.reponse && (
                  <p className="mt-1 text-body-sm text-on-surface-variant">{rdv.reponse}</p>
                )}

                {traite && rdv.etat === "DEMANDE" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                    <input
                      type="datetime-local"
                      aria-label="Date retenue"
                      className={`${CHAMP} w-[220px]`}
                      value={reponses[rdv.id]?.fixe ?? ""}
                      onChange={(e) =>
                        setReponses((p) => ({
                          ...p,
                          [rdv.id]: { fixe: e.target.value, texte: p[rdv.id]?.texte ?? "" },
                        }))
                      }
                    />
                    <input
                      className={`${CHAMP} min-w-[200px] flex-1`}
                      placeholder="Message au demandeur"
                      value={reponses[rdv.id]?.texte ?? ""}
                      onChange={(e) =>
                        setReponses((p) => ({
                          ...p,
                          [rdv.id]: { fixe: p[rdv.id]?.fixe ?? "", texte: e.target.value },
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => repondre(rdv, "CONFIRME")}
                      className="h-9 rounded-lg bg-primary px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => repondre(rdv, "REFUSE")}
                      className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:text-error"
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
