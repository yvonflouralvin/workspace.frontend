"use client";

import { useState, useRef, useEffect } from "react";
import { SearchOutlined, EastOutlined } from "@mui/icons-material";
import Link from "next/link";
import { AppDefinition } from "../types/shell";

const RECENT_KEY = "ws_recent_apps";

/** Une app dont le domaine n'est pas configuré retombe sur `localhost:<port>`
 *  (cf. `platform.tsx`), ce qui est juste quand on développe en local et FAUX
 *  partout ailleurs : depuis un domaine public, le lien mène à une page qui
 *  n'existe pas, sans un mot d'explication.
 *
 *  On ne propose donc pas ces apps quand on n'est pas soi-même sur localhost.
 *  Les taire vaut mieux qu'un cul-de-sac : l'utilisateur ne peut pas deviner
 *  qu'il manque une variable d'environnement au conteneur.
 */
function joignable(app: AppDefinition): boolean {
  if (typeof window === "undefined") return true;
  const ici = window.location.hostname;
  if (ici === "localhost" || ici === "127.0.0.1") return true;
  try {
    const cible = new URL(app.url).hostname;
    return cible !== "localhost" && cible !== "127.0.0.1";
  } catch {
    return false;
  }
}

function useRecentApps(apps: AppDefinition[]) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {}
  }, []);

  const recentApps = recentIds
    .map((id) => apps.find((a) => a.id === id))
    .filter(Boolean) as AppDefinition[];

  function track(id: string) {
    const next = [id, ...recentIds.filter((r) => r !== id)].slice(0, 5);
    setRecentIds(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  return { recentApps, track };
}

interface AppSelectorProps {
  apps: AppDefinition[];
  allAppsUrl: string;
  onClose: () => void;
}

export function AppSelector({ apps: toutes, allAppsUrl, onClose }: AppSelectorProps) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  // Le filtre est appliqué APRÈS le montage : au rendu serveur on garde tout,
  // sinon l'hydratation trouverait une liste différente de celle du HTML.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  const apps = monte ? toutes.filter(joignable) : toutes;
  const { recentApps, track } = useRecentApps(apps);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  const filtered = query.trim()
    ? apps.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    : null;

  const displayApps = filtered ?? (recentApps.length > 0 ? recentApps : apps);
  const sectionLabel = filtered
    ? "Résultats"
    : recentApps.length > 0
    ? "Récentes"
    : "Applications";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 w-[15rem] sm:w-72 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg overflow-hidden z-50"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-outline-variant">
        <SearchOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
          placeholder="Rechercher une application…"
        />
      </div>

      <div className="p-2">
        <p className="px-2 py-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {sectionLabel}
        </p>
        {displayApps.map((app) => (
          <a
            key={app.id}
            href={app.url}
            onClick={() => { track(app.id); onClose(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container transition-colors"
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: app.color ?? "#6b7280" }}
            >
              {typeof app.icon === "string" ? app.icon : (app.name[0] ?? "?")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface">{app.name}</p>
              {app.description && (
                <p className="text-xs text-on-surface-variant truncate">{app.description}</p>
              )}
            </div>
          </a>
        ))}
        {displayApps.length === 0 && (
          <p className="px-3 py-4 text-sm text-on-surface-variant text-center">
            Aucune application trouvée
          </p>
        )}
      </div>

      <div className="border-t border-outline-variant p-2">
        <Link
          href={allAppsUrl}
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
        >
          <EastOutlined style={{ fontSize: 16 }} />
          Toutes les applications
        </Link>
      </div>
    </div>
  );
}
