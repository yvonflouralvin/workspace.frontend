import { apiFetch } from "@repo/network/client";
import { useSessionStore } from "../store/session.store.js";
import { domaineDepose } from "@repo/network/config";

export function useLogout(logoutPath = "/api/logout") {
  const { logout } = useSessionStore();
  return async function handleLogout() {
    logout();
    try {
      await apiFetch(logoutPath, { method: "POST" });
    } catch {
      // redirect regardless
    }
    window.location.href =
      domaineDepose("auth") ?? process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";
  };
}
