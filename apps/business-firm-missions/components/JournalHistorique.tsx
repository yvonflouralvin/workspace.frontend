"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AttachFileOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  FactCheckOutlined,
  HistoryOutlined,
  SwapHorizOutlined,
  TaskAltOutlined,
} from "@mui/icons-material";
import type { EvenementMission, EvenementTache } from "@/lib/bfm-suivi-api";
import { dateHeureFr } from "@/lib/format";

function iconeDe(action: string) {
  const s = { fontSize: 15 };
  if (action === "STATUT") return <SwapHorizOutlined style={s} />;
  if (action === "ACTION_STATUT") return <TaskAltOutlined style={s} />;
  if (action === "SUPPRIMEE") return <DeleteOutlineOutlined style={s} />;
  if (action.startsWith("ELEMENT")) return <FactCheckOutlined style={s} />;
  if (action === "PIECE") return <AttachFileOutlined style={s} />;
  if (action === "CREE") return <HistoryOutlined style={s} />;
  return <EditOutlined style={s} />;
}

/** Le journal : une ligne par fait, l'auteur en gras, la phrase, l'heure.
 *
 *  Sert à la tâche comme à la mission. Au niveau de la mission, `situer` dit de quelle tâche parle
 *  chaque ligne — un lien tant qu'elle existe, son titre seul une fois supprimée. */
export function JournalHistorique({
  lignes,
  situer,
}: {
  lignes: (EvenementTache | EvenementMission)[];
  situer?: (l: EvenementMission) => ReactNode;
}) {
  return (
    <ol className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
      {lignes.map((l) => (
        <li key={l.id} className="flex items-start gap-3 px-4 md:px-5 py-3">
          <span className="flex-none mt-0.5 w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center">
            {iconeDe(l.action)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-on-surface">
              <strong className="font-semibold">{l.user_nom ?? "Un membre"}</strong> {l.libelle}
            </p>
            {situer && "tache_titre" in l && <p className="mt-0.5 text-label-md text-outline">{situer(l)}</p>}
          </div>
          <time className="flex-none text-label-md text-outline whitespace-nowrap" dateTime={l.created_at}>
            {dateHeureFr(l.created_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}

export function LienTache({ href, titre, supprimee }: { href: string | null; titre: string | null; supprimee: boolean }) {
  if (supprimee || !href) {
    return <span>Tâche : {titre ?? "inconnue"} <em>(supprimée)</em></span>;
  }
  return (
    <span>
      Tâche :{" "}
      <Link href={href} className="font-medium text-on-surface-variant hover:text-primary transition-colors">
        {titre}
      </Link>
    </span>
  );
}
