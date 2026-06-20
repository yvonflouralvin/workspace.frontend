// packages/auth/api/session.ts

import { apiFetch } from "@repo/network/client";
import { SessionResponse } from "../types/session.js";

export async function getSession(): Promise<SessionResponse> {
  const response = await apiFetch("/api/auth/session");

  return response.json();
}
