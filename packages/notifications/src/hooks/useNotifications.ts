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

export function useNotifications(basePath?: string, realtimePath: string = DEFAULT_WS_PATH) {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications(basePath);
      setItems(data.items);
      setUnreadCount(data.unread_count);
      setError(null);
    } catch {
      setError("Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  // Rafraîchissement silencieux (WS / polling) : met à jour sans toggler `loading`.
  const silentRefresh = useCallback(async () => {
    try {
      const data = await listNotifications(basePath);
      setItems(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      /* silencieux */
    }
  }, [basePath]);

  const pollUnread = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount(basePath));
    } catch {
      /* silencieux : le prochain tick réessaiera */
    }
  }, [basePath]);

  // Compteur au montage, puis polling léger en fallback (si le WS est bloqué/tombé).
  useEffect(() => {
    pollUnread();
    const id = setInterval(pollUnread, POLL_MS);
    return () => clearInterval(id);
  }, [pollUnread]);

  // Temps réel : WebSocket vers la gateway dédiée (même origine, routée par nginx).
  // À la réception d'un signal, on refait le fetch chiffré du feed. Reconnexion backoff.
  const silentRef = useRef(silentRefresh);
  silentRef.current = silentRefresh;
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
        silentRef.current();
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
        await refetch();
      } catch {
        /* silencieux */
      }
    },
    [basePath, refetch],
  );

  const markAllRead = useCallback(async () => {
    try {
      await apiMarkAllRead(basePath);
      await refetch();
    } catch {
      /* silencieux */
    }
  }, [basePath, refetch]);

  return { items, unreadCount, loading, error, refetch, markRead, markAllRead };
}
