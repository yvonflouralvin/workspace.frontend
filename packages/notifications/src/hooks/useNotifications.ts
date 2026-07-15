"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUnreadCount,
  listNotifications,
  markAllRead as apiMarkAllRead,
  markRead as apiMarkRead,
} from "../api/client";
import type { InAppNotification } from "../types/notification";

const POLL_MS = 30_000;

export function useNotifications(basePath?: string) {
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

  const pollUnread = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount(basePath));
    } catch {
      /* silencieux : le prochain tick réessaiera */
    }
  }, [basePath]);

  // Compteur au montage, puis polling léger (norme du repo : 30 s).
  useEffect(() => {
    pollUnread();
    const id = setInterval(pollUnread, POLL_MS);
    return () => clearInterval(id);
  }, [pollUnread]);

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
