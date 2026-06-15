// packages/auth/hooks/usePermissions.ts

import { useSessionStore } from "../store/session.store.js";

export function usePermissions() {

  const permissions = useSessionStore((s) => s.permissions);

  function can(permission: string) {
    return permissions.includes(permission);
  }

  return {
    permissions,
    can,
  };
}