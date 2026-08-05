"use client";

import { Fragment, useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  SearchOutlined,
  AppsOutlined,
  MenuOutlined,
  NotificationsOutlined,
  SettingsOutlined,
  LogoutOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";
import Link from "next/link";
import { AppDefinition, UserSummary } from "../types/shell";
import { AppSelector } from "./AppSelector";
import { useShell } from "./AppShell";
import { Avatar } from "../Avatar";

export interface SearchResult {
  id: number | string;
  title: string;
  subtitle: string | null;
  url: string;
}

export interface SearchSection {
  domain_key: string;
  label: string;
  app_name: string;
  results: SearchResult[];
}

interface TopBarProps {
  apps: AppDefinition[];
  allAppsUrl: string;
  user: UserSummary | null;
  preferencesUrl: string;
  notificationsCount?: number;
  // Slot pour une cloche de notification autonome (ex. <NotificationBell/> de
  // @repo/notifications). Si fourni, remplace le bouton cloche présentationnel.
  notifications?: React.ReactNode;
  /** Contrôles propres à l'app, posés à gauche des actions communes. */
  extraActions?: React.ReactNode;
  onLogout?: () => void;
  onSearch?: (q: string) => Promise<SearchSection[]>;
  appName?: string;
  appHref?: string;
  appIcon?: string;
  appColor?: string;
  routeLabels?: Record<string, string>;
  routeIcons?: Record<string, React.ReactNode>;
  /**
   * `"search-first"` = disposition du design system : pilule de recherche à
   * gauche, actions à droite, pas de fil d'Ariane. `"breadcrumbs"` conserve la
   * disposition historique, le temps que les autres apps basculent.
   */
  variant?: "breadcrumbs" | "search-first";
}

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function Breadcrumbs({
  appName,
  appHref = "/",
  appIcon,
  appColor,
  routeLabels = {},
  routeIcons = {},
}: {
  appName?: string;
  appHref?: string;
  appIcon?: string;
  appColor?: string;
  routeLabels?: Record<string, string>;
  routeIcons?: Record<string, React.ReactNode>;
}) {
  const pathname = usePathname();
  const [ellipsisOpen, setEllipsisOpen] = useState(false);
  const ellipsisRef = useRef<HTMLDivElement>(null);

  const rawSegments = pathname.split("/").filter(Boolean);
  const pathSegments: BreadcrumbSegment[] = rawSegments.map((seg, i) => {
    const href = "/" + rawSegments.slice(0, i + 1).join("/");
    return { label: routeLabels[href] ?? seg, href };
  });

  const appSegment: BreadcrumbSegment | null = appName
    ? { label: appName, href: appHref }
    : null;

  // Deduplicate: if the first path segment matches appHref, it would duplicate the app name
  const dedupedSegments = appSegment
    ? pathSegments.filter(seg => seg.href !== appHref)
    : pathSegments;
  const all: BreadcrumbSegment[] = appSegment ? [appSegment, ...dedupedSegments] : pathSegments;

  useEffect(() => {
    if (!ellipsisOpen) return;
    function onDown(e: MouseEvent) {
      if (ellipsisRef.current && !ellipsisRef.current.contains(e.target as Node)) {
        setEllipsisOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ellipsisOpen]);

  if (all.length === 0) return null;

  const MAX_VISIBLE = 4;

  let visible: (BreadcrumbSegment | "ellipsis")[];
  let collapsed: BreadcrumbSegment[];

  if (all.length <= MAX_VISIBLE) {
    visible = all;
    collapsed = [];
  } else {
    const tail = all.slice(-(MAX_VISIBLE - 2));
    collapsed = all.slice(1, all.length - (MAX_VISIBLE - 2));
    visible = [all[0]!, "ellipsis", ...tail];
  }

  return (
    <nav className="flex items-center gap-0.5 text-body-sm min-w-0" aria-label="Fil d'Ariane">
      {visible.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="text-outline mx-0.5 shrink-0 select-none">/</span>
          )}
          {item === "ellipsis" ? (
            <div ref={ellipsisRef} className="relative shrink-0">
              <button
                onClick={() => setEllipsisOpen((v) => !v)}
                className="px-1.5 py-0.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors leading-none"
                aria-label="Afficher les éléments cachés"
              >
                …
              </button>
              {ellipsisOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 min-w-36">
                  {collapsed.map((seg) => (
                    <Link
                      key={seg.href}
                      href={seg.href}
                      onClick={() => setEllipsisOpen(false)}
                      className="block px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors truncate max-w-48"
                    >
                      {seg.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (() => {
            const isAppName = appSegment !== null && item.href === appSegment.href;
            const isLast = item.href === all[all.length - 1]?.href;
            const appBadge = isAppName && appIcon ? (
              <span
                className="shrink-0 flex items-center justify-center rounded-md text-white font-bold leading-none"
                style={{ width: 18, height: 18, fontSize: 10, backgroundColor: appColor ?? "#6b7280" }}
              >
                {appIcon}
              </span>
            ) : null;
            const icon = appBadge ?? routeIcons[item.href];
            const content = (
              <span className={`flex items-center gap-1 ${isAppName ? "font-semibold text-on-surface" : ""}`}>
                {icon && (
                  <span className="shrink-0 flex items-center" style={{ fontSize: 14 }}>{icon}</span>
                )}
                <span className="truncate max-w-40">
                  {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                </span>
              </span>
            );
            return isLast ? (
              <span className={`shrink flex items-center ${isAppName ? "text-on-surface" : "text-on-surface-variant"}`}>
                {content}
              </span>
            ) : (
              <Link
                href={item.href}
                className={`shrink flex items-center transition-colors ${
                  isAppName
                    ? "text-on-surface hover:text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {content}
              </Link>
            );
          })()}
        </Fragment>
      ))}
    </nav>
  );
}

export function TopBar({
  apps,
  allAppsUrl,
  user,
  preferencesUrl,
  notificationsCount = 0,
  notifications,
  extraActions,
  onLogout,
  onSearch,
  appName,
  appHref,
  appIcon,
  appColor,
  routeLabels,
  routeIcons,
  variant = "breadcrumbs",
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [appSelectorOpen, setAppSelectorOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setAppSelectorOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const searchFirst = variant === "search-first";
  const { setMobileNavOpen } = useShell();
  const pathname = usePathname();
  // Sur mobile la barre se réduit à : hamburger + titre de page + cloche.
  // On remonte le chemin jusqu'au libellé connu le plus proche : /projects/12/board
  // n'a pas d'entrée propre mais doit afficher « Projets ».
  const rawTitle = (() => {
    if (!routeLabels) return "";
    const segments = pathname.split("/").filter(Boolean);
    for (let i = segments.length; i > 0; i--) {
      const label = routeLabels["/" + segments.slice(0, i).join("/")];
      if (label) return label;
    }
    return routeLabels["/"] ?? "";
  })();
  const mobileTitle = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : appName;

  const searchPill = onSearch && (
    <button
      onClick={() => setSearchOpen(true)}
      className={
        searchFirst
          ? "flex flex-1 max-w-[420px] items-center gap-2 h-9 px-3 rounded-lg bg-background border border-outline-soft text-outline hover:border-primary/40 transition-colors"
          : "flex items-center gap-2 px-3 h-9 min-w-[200px] rounded-lg bg-background border border-outline-soft text-outline hover:border-primary/40 transition-colors"
      }
    >
      <SearchOutlined style={{ fontSize: 16 }} />
      <span className="flex-1 text-left text-body-sm whitespace-nowrap">
        Rechercher dans le workspace…
      </span>
      <kbd className="text-[11px] font-mono text-outline bg-surface-container-lowest border border-outline-soft rounded-sm px-[5px] leading-4">
        ⌘K
      </kbd>
    </button>
  );

  const actions = (
    <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
      {extraActions}
      <div className="relative">
        <button
          onClick={() => setAppSelectorOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
          title="Applications"
        >
          <AppsOutlined style={{ fontSize: 18 }} />
        </button>
        {appSelectorOpen && (
          <AppSelector
            apps={apps}
            allAppsUrl={allAppsUrl}
            onClose={() => setAppSelectorOpen(false)}
          />
        )}
      </div>

      {notifications ?? (
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
          title="Notifications"
        >
          <NotificationsOutlined style={{ fontSize: 18 }} />
          {notificationsCount > 0 && (
            <span className="absolute top-1.5 right-2 w-[7px] h-[7px] rounded-full bg-error border-2 border-surface-container-lowest" />
          )}
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="rounded-full hover:opacity-90 transition-opacity ml-0.5"
          title={user?.username ?? "Profil"}
        >
          <Avatar name={user?.username ?? user?.email} size={32} variant="solid" />
        </button>
        {userMenuOpen && (
          <UserMenu
            user={user}
            preferencesUrl={preferencesUrl}
            onClose={() => setUserMenuOpen(false)}
            onLogout={onLogout}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex items-center w-full h-full px-4 md:px-5 gap-3 md:gap-4">
      <button
        onClick={() => setMobileNavOpen(true)}
        aria-label="Ouvrir la navigation"
        className="md:hidden w-11 h-11 -ml-2 flex-none flex items-center justify-center rounded-lg text-on-surface-variant"
      >
        <MenuOutlined style={{ fontSize: 22 }} />
      </button>
      <span className="md:hidden flex-1 min-w-0 truncate font-display text-[17px] font-semibold text-on-surface">
        {mobileTitle}
      </span>

      <div className="hidden md:contents">
      {searchFirst ? (
        <>
          {searchPill}
          <div className="flex-1" />
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <Breadcrumbs
              appName={appName}
              appHref={appHref}
              appIcon={appIcon}
              appColor={appColor}
              routeLabels={routeLabels}
              routeIcons={routeIcons}
            />
          </div>
          {searchPill}
        </>
      )}

      </div>

      <div className="flex-none flex items-center">{actions}</div>

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onSearch={onSearch} />
      )}
    </div>
  );
}

function UserMenu({
  user,
  preferencesUrl,
  onClose,
  onLogout,
}: {
  user: UserSummary | null;
  preferencesUrl: string;
  onClose: () => void;
  onLogout?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 w-56 max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg overflow-hidden z-50"
    >
      {user && (
        <div className="px-4 py-3 border-b border-outline-variant">
          <p className="text-sm font-semibold text-on-surface">{user.username}</p>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">{user.email}</p>
        </div>
      )}
      <div className="p-1.5">
        <Link
          href={preferencesUrl}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-on-surface hover:bg-surface-container transition-colors"
        >
          <SettingsOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
          Préférences
        </Link>
        <button
          onClick={() => { onClose(); onLogout?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-error hover:bg-error-container/30 transition-colors"
        >
          <LogoutOutlined style={{ fontSize: 18 }} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

function SearchModal({
  onClose,
  onSearch,
}: {
  onClose: () => void;
  onSearch?: (q: string) => Promise<SearchSection[]>;
}) {
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!onSearch || q.trim().length < 2) {
        setSections([]);
        return;
      }
      setLoading(true);
      try {
        const result = await onSearch(q.trim());
        setSections(result);
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch]
  );

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  const hasResults = sections.length > 0;
  const isEmpty = !loading && query.trim().length >= 2 && !hasResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[36rem] bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <SearchOutlined className="text-on-surface-variant shrink-0" style={{ fontSize: 20 }} />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-body-md outline-none"
            placeholder="Rechercher dans toutes les applications…"
          />
          {loading && (
            <span className="text-label-sm text-on-surface-variant shrink-0 animate-pulse">
              Recherche…
            </span>
          )}
          <kbd className="text-xs text-outline bg-surface-container rounded px-1.5 py-0.5 font-mono shrink-0">
            Esc
          </kbd>
        </div>

        {!query.trim() && (
          <div className="px-4 py-8 text-body-sm text-on-surface-variant text-center">
            Tapez au moins 2 caractères pour lancer la recherche.
          </div>
        )}

        {isEmpty && (
          <div className="px-4 py-8 text-body-sm text-on-surface-variant text-center">
            Aucun résultat pour «&nbsp;{query}&nbsp;».
          </div>
        )}

        {hasResults && (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-outline-variant">
            {sections.map((section) => (
              <div key={section.domain_key} className="py-2">
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <span className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wide">
                    {section.label}
                  </span>
                  <span className="text-label-sm text-on-surface-variant/60">
                    · {section.app_name}
                  </span>
                </div>
                {section.results.map((result) => (
                  <a
                    key={result.id}
                    href={result.url}
                    onClick={onClose}
                    className="group flex items-start gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-on-surface truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-body-sm text-on-surface-variant truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <OpenInNewOutlined
                      style={{ fontSize: 14 }}
                      className="text-on-surface-variant shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
