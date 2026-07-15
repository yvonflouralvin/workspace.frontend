// Web Push : enregistrement du Service Worker + abonnement PushManager (VAPID).
// Le contenu (titre/corps) est envoyé chiffré par le protocole Web Push ; le SW l'affiche.

import { deletePushSubscription, getPushPublicKey, savePushSubscription } from "../api/client";

export type PushState = "unsupported" | "denied" | "granted" | "default";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buffer;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushState(swPath = "/sw.js"): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration(swPath);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub && Notification.permission === "granted") return "granted";
  } catch {
    /* ignore */
  }
  return Notification.permission === "granted" ? "granted" : "default";
}

export async function enablePush(basePath?: string, swPath = "/sw.js"): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushState;

  const reg = await navigator.serviceWorker.register(swPath);
  await navigator.serviceWorker.ready;
  const key = await getPushPublicKey(basePath);
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(key),
    }));
  await savePushSubscription(sub.toJSON(), basePath);
  return "granted";
}

export async function disablePush(basePath?: string, swPath = "/sw.js"): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(swPath);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  await deletePushSubscription(endpoint, basePath);
}
