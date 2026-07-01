"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  SearchOutlined,
  AppsOutlined,
  NotificationsOutlined,
  SettingsOutlined,
  LogoutOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";
import Link from "next/link";
import { AppDefinition, UserSummary } from "../types/shell";
import { AppSelector } from "./AppSelector";

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
  onLogout?: () => void;
  onSearch?: (q: string) => Promise<SearchSection[]>;
}

export function TopBar({
  apps,
  allAppsUrl,
  user,
  preferencesUrl,
  notificationsCount = 0,
  onLogout,
  onSearch,
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

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "??";

  return (
    <div className="flex items-center w-full px-4 gap-3 h-full">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 px-3 h-9 rounded-xl bg-surface-container text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors"
        style={{ minWidth: "220px" }}
      >
        <SearchOutlined style={{ fontSize: 18 }} />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="text-xs text-outline bg-surface-container-high rounded px-1.5 py-0.5 font-mono">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          <button
            onClick={() => setAppSelectorOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Applications"
          >
            <AppsOutlined style={{ fontSize: 20 }} />
          </button>
          {appSelectorOpen && (
            <AppSelector
              apps={apps}
              allAppsUrl={allAppsUrl}
              onClose={() => setAppSelectorOpen(false)}
            />
          )}
        </div>

        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Notifications"
        >
          <NotificationsOutlined style={{ fontSize: 20 }} />
          {notificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center hover:opacity-90 transition-opacity ml-1"
            title={user?.username ?? "Profil"}
          >
            {initials}
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
      className="absolute right-0 top-10 w-56 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg overflow-hidden z-50"
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
