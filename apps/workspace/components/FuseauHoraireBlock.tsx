"use client";

import { useState } from "react";
import { ScheduleOutlined } from "@mui/icons-material";
import { updateWorkspaceTimezone, ApiError } from "@/app/lib/api";
import type { WorkspaceDetail } from "@/app/lib/types";

/** Le fuseau du workspace.
 *
 *  Sans lui, les heures s'affichent dans celui du SERVEUR : une réservation
 *  posée à 14 h apparaît à 15 h, et l'application semble croire qu'on est en
 *  avance ou en retard.
 *
 *  On enregistre un identifiant IANA (« Africa/Kinshasa ») et non un décalage
 *  en heures : un décalage fixe se trompe deux fois par an dans les pays à
 *  heure d'été, et personne ne pense à le corriger.
 */
export function FuseauHoraireBlock({
  workspaceId,
  workspaceDetail,
  onUpdated,
  onError,
}: {
  workspaceId: number;
  workspaceDetail: WorkspaceDetail;
  onUpdated: (detail: WorkspaceDetail) => void;
  onError: (message: string) => void;
}) {
  // La liste du navigateur plutôt qu'une liste écrite à la main : elle est
  // complète, à jour, et localisée sans effort.
  const fuseaux =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  const duNavigateur = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [valeur, setValeur] = useState(workspaceDetail.timezone ?? "");
  const [enCours, setEnCours] = useState(false);

  const apercu = (tz: string) => {
    try {
      return new Date().toLocaleString("fr-FR", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "—";
    }
  };

  async function enregistrer(tz: string) {
    setEnCours(true);
    try {
      onUpdated(await updateWorkspaceTimezone(workspaceId, tz || null));
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5">
      <div className="mb-3">
        <h2 className="flex items-center gap-1.5 text-body-lg font-medium text-on-surface">
          <ScheduleOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
          Fuseau horaire
        </h2>
        <p className="mt-0.5 max-w-[70ch] leading-relaxed text-label-md text-outline">
          Les dates et heures s&apos;affichent dans ce fuseau. Sans réglage, elles suivent
          celui du serveur — ce qui décale les créneaux pour tout le monde.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[18rem] flex-1 flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Fuseau du workspace</span>
          <select
            value={valeur}
            disabled={enCours}
            onChange={(e) => {
              setValeur(e.target.value);
              void enregistrer(e.target.value);
            }}
            className="h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="">Fuseau du serveur (par défaut)</option>
            {fuseaux.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <div className="pb-1">
          <p className="text-label-md text-on-surface-variant">Il est actuellement</p>
          <p className="text-body-md tabular-nums text-on-surface">
            {apercu(valeur || duNavigateur)}
          </p>
        </div>
      </div>

      {!valeur && (
        <p className="mt-2 text-label-md text-outline">
          Votre navigateur indique <span className="text-on-surface">{duNavigateur}</span> —
          c&apos;est probablement le fuseau à choisir.
        </p>
      )}
    </div>
  );
}
