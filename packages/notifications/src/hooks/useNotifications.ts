"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getUnreadCount,
  listNotifications,
  markAllRead as apiMarkAllRead,
  markRead as apiMarkRead,
} from "../api/client";
import type { InAppNotification } from "../types/notification";

const POLL_MS = 30_000;
const DEFAULT_WS_PATH = "/ws/notifications";

export interface UseNotificationsOptions {
  realtimePath?: string;
  // Appelé pour chaque notification nouvellement arrivée (après le montage initial).
  // Sert à déclencher son + toast. Jamais appelé pour les notifs déjà présentes au chargement.
  onNew?: (notification: InAppNotification) => void;
}

export function useNotifications(basePath?: string, options: UseNotificationsOptions = {}) {
  const { realtimePath = DEFAULT_WS_PATH, onNew } = options;

  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seenRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const prevUnreadRef = useRef(0);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  // Applique un feed fraîchement récupéré et détecte les nouvelles notifications.
  const applyFeed = useCallback((data: { items: InAppNotification[]; unread_count: number }) => {
    setItems(data.items);
    setUnreadCount(data.unread_count);
    prevUnreadRef.current = data.unread_count;

    if (!initializedRef.current) {
      // Baseline au premier chargement : tout est « déjà vu », aucun toast.
      data.items.forEach((n) => seenRef.current.add(n.id));
      initializedRef.current = true;
      return;
    }
    const fresh = data.items.filter((n) => !seenRef.current.has(n.id));
    data.items.forEach((n) => seenRef.current.add(n.id));
    // De la plus ancienne à la plus récente → le toast le plus récent apparaît en dernier.
    for (const n of [...fresh].reverse()) onNewRef.current?.(n);
  }, []);

  const loadFeed = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        applyFeed(await listNotifications(basePath));
        setError(null);
      } catch {
        if (!silent) setError("Impossible de charger les notifications.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [basePath, applyFeed],
  );

  const refetch = useCallback(() => loadFeed(false), [loadFeed]);

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  // Montage : établit la baseline (seen) puis polling léger en fallback (WS bloqué/tombé).
  useEffect(() => {
    loadFeed(true);
    const id = setInterval(async () => {
      try {
        const count = await getUnreadCount(basePath);
        if (count > prevUnreadRef.current) {
          // Le compteur a monté → récupérer les items pour toaster les nouvelles.
          await loadFeedRef.current(true);
        } else {
          setUnreadCount(count);
          prevUnreadRef.current = count;
        }
      } catch {
        /* silencieux : le prochain tick réessaiera */
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadFeed, basePath]);

  // Temps réel : WebSocket vers la gateway dédiée (même origine, routée par nginx).
  // À réception d'un signal → refetch silencieux → détection + son/toast. Reconnexion backoff.
  useEffect(() => {
    if (typeof window === "undefined" || !realtimePath) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}${realtimePath}`;
    let ws: WebSocket | null = null;
    let retry = 0;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        return;
      }
      ws.onopen = () => {
        retry = 0;
      };
      ws.onmessage = () => {
        loadFeedRef.current(true);
      };
      ws.onclose = () => {
        if (closed) return;
        const delay = Math.min(30_000, 1_000 * 2 ** retry);
        retry += 1;
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [realtimePath]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await apiMarkRead(id, basePath);
        await loadFeed(false);
      } catch {
        /* silencieux */
      }
    },
    [basePath, loadFeed],
  );

  const markAllRead = useCallback(async () => {
    try {
      await apiMarkAllRead(basePath);
      await loadFeed(false);
    } catch {
      /* silencieux */
    }
  }, [basePath, loadFeed]);

  return { items, unreadCount, loading, error, refetch, markRead, markAllRead };
}
