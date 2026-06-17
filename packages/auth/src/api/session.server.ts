// packages/auth/api/session.server.ts

import { cookies } from "next/headers.js";
import { SessionResponse } from "../types/session.js";

const EMPTY_SESSION: SessionResponse = {
  authenticated: false,
  user: null,
  active_workspace: null,
  workspaces: [],
  groups: [],
  permissions: [],
};

export async function getServerSession(): Promise<SessionResponse> {
  const AUTH_API_URL = process.env.AUTH_API_URL;
  if (!AUTH_API_URL) return EMPTY_SESSION;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return EMPTY_SESSION;

  try {
    const response = await fetch(`${AUTH_API_URL}/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) return EMPTY_SESSION;

    return await response.json();
  } catch {
    return EMPTY_SESSION;
  }
}
