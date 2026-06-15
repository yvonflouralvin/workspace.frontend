// packages/auth/api/session.ts

import { SessionResponse } from "../types/session.js";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export async function getSession():
Promise<SessionResponse> {

  const response = await fetch(
    `${AUTH_API}/auth/session`,
    {
      credentials: "include",
    }
  );

  console.log(`GetSession() : `, {response});

  return response.json();
}