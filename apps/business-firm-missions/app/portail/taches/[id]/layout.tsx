"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowBackOutlined, FolderOpenOutlined, NotesOutlined } from "@mui/icons-material";
import { avancerTachePortail, getTachePortail, type PortailTache, type StatutClient } from "@/lib/bfm-portail-api";
import { StatutTachePill } from "@/app/missions/[id]/ui";
import { PortailTacheProvider } from "./tache-context";

export default function TachePortailLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const [tache, setTache] = useState<PortailTache | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    getTachePortail(Number(id))
      .then(setTache)
      .catch(() => setIntrouvable(true));
  }, [id]);

  const avancer = useCallback(
    async (statut: StatutClient) => {
      setErreur(null);
      try {
        setTache(await avancerTachePortail(Number(id), statut));
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Mise à jour impossible.");
      }
    },
    [id],
  );

  if (introuvable) {
    return (
      <div className="space-y-4">
        <Link href="/portail" className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
          <ArrowBackOutlined style={{ fontSize: 15 }} /> Accueil
        </Link>
        <p className="text-body-md text-error">Tâche introuvable.</p>
      </div>
    );
  }
  if (!tache) return <p className="text-body-md text-on-surface-variant">Chargement…</p>;

  const base = `/portail/taches/${tache.id}`;
  const surDocuments = pathname.endsWith("/documents");
  const sections = [
    { key: "apercu", href: base, label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} />, actif: !surDocuments },
    { key: "documents", href: `${base}/documents`, label: "Documents", icon: <FolderOpenOutlined style={{ fontSize: 17 }} />, actif: surDocuments },
  ];

  return (
    <div>
      <Link
        href={`/portail/missions/${tache.mission_id}`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> {tache.mission_nom ?? "Mission"}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-md font-medium text-outline">
            {[tache.mission_nom, tache.phase_nom].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-0.5 font-display text-headline-md text-on-surface">{tache.titre}</h1>
        </div>
        <div className="flex-none pt-4">
          <StatutTachePill statut={tache.statut} />
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {sections.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
              s.actif
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="inline-flex items-center">{s.icon}</span>
            {s.label}
          </Link>
        ))}
      </nav>

      <PortailTacheProvider value={{ tache, avancer, erreur }}>{children}</PortailTacheProvider>
    </div>
  );
}
