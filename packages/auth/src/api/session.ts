// packages/auth/api/session.ts

import { SessionResponse } from "../types/session.js";

const SESSION_URL =
  process.env.NEXT_PUBLIC_SESSION_API ??
  `${process.env.NEXT_PUBLIC_AUTH_API}/auth/session`;

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch(SESSION_URL, {
    credentials: "include",
  });

  return response.json();
}
