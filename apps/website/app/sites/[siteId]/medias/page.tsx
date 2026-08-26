"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowBackOutlined, CloudUploadOutlined, DeleteOutlineOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import { api, urlMediaEditeur, type Media } from "@/app/lib/api";

const CHAMP =
  "h-8 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

function poids(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Kio`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mio`;
}

/** La bibliothèque de médias du site, en plein écran.
 *
 *  La même que la modale de l'éditeur, mais ici on peut aussi RENOMMER et
 *  écrire le texte alternatif : deux gestes qu'on ne fait pas au milieu d'une
 *  mise en page, et qui décident pourtant de l'accessibilité du site.
 */
export default function MediasPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = Number(params.siteId);
  const { can } = usePermissions();
  const peutGerer = can("website.medias.manage");

  const [medias, setMedias] = useState<Media[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [progres, setProgres] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const fichierRef = useRef<HTMLInputElement | null>(null);

  const charger = useCallback(async () => {
    try {
      setMedias(await api.medias(siteId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setMedias([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function televerser(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur(null);
    for (const fichier of Array.from(fichiers)) {
      setProgres(0);
      try {
        await api.televerserMedia(siteId, fichier, setProgres);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Téléversement impossible.");
      }
    }
    setProgres(null);
    await charger();
  }

  async function renommer(media: Media, champ: "nom" | "alt", valeur: string) {
    const propre = valeur.trim();
    if ((media[champ] ?? "") === propre) return;
    try {
      await api.modifierMedia(media.id, { [champ]: propre });
      setMedias((liste) =>
        (liste ?? []).map((m) => (m.id === media.id ? { ...m, [champ]: propre } : m)),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    }
  }

  async function supprimer(media: Media, force: boolean) {
    setBusy(true);
    try {
      await api.supprimerMedia(media.id, force);
      setASupprimer(null);
      setToast("Média supprimé.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Retour au site
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Médias</h1>
            <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
              Les images du site. Le texte alternatif est lu par les lecteurs d&apos;écran et
              s&apos;affiche quand l&apos;image ne charge pas — écrivez-le.
            </p>
          </div>
          <button
            type="button"
            disabled={!peutGerer || progres !== null}
            onClick={() => fichierRef.current?.click()}
            title={peutGerer ? undefined : "Vous n'avez pas le droit d'ajouter un média."}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <CloudUploadOutlined style={{ fontSize: 18 }} />
            Téléverser
          </button>
          <input
            ref={fichierRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void televerser(e.target.files)}
          />
        </div>

        {progres !== null && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progres}%` }}
            />
          </div>
        )}

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {medias === null ? (
          <p className="mt-8 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : medias.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-title-sm text-on-surface">Aucun média</p>
            <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
              Téléversez vos images ici, ou directement depuis l&apos;éditeur d&apos;une page.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {medias.map((media) => (
              <li
                key={media.id}
                className="overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlMediaEditeur(media.jeton)}
                  alt={media.alt ?? media.nom}
                  className="h-36 w-full bg-surface-container object-contain"
                />
                <div className="space-y-1.5 p-2.5">
                  <input
                    className={CHAMP}
                    defaultValue={media.nom}
                    disabled={!peutGerer}
                    aria-label="Nom du fichier"
                    onBlur={(e) => void renommer(media, "nom", e.target.value)}
                  />
                  <input
                    className={CHAMP}
                    defaultValue={media.alt ?? ""}
                    disabled={!peutGerer}
                    placeholder="Texte alternatif"
                    aria-label="Texte alternatif"
                    onBlur={(e) => void renommer(media, "alt", e.target.value)}
                  />
                  <div className="flex items-center justify-between text-label-md text-outline">
                    <span>
                      {poids(media.octets)}
                      {media.largeur && media.hauteur
                        ? ` · ${media.largeur}×${media.hauteur}`
                        : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <span>
                        {media.pages === 0
                          ? "inutilisé"
                          : `${media.pages} page${media.pages > 1 ? "s" : ""}`}
                      </span>
                      {peutGerer && (
                        <button
                          type="button"
                          aria-label={`Supprimer ${media.nom}`}
                          onClick={() => setASupprimer(media)}
                          className="text-outline transition-colors hover:text-error"
                        >
                          <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom} » ?`}
          message={
            aSupprimer.pages > 0
              ? `Cette image est utilisée par ${aSupprimer.pages} page${
                  aSupprimer.pages > 1 ? "s" : ""
                }. La supprimer y laissera un trou.`
              : "Le fichier est effacé définitivement."
          }
          confirmLabel="Supprimer"
          busy={busy}
          onCancel={() => setASupprimer(null)}
          onConfirm={() => void supprimer(aSupprimer, aSupprimer.pages > 0)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
