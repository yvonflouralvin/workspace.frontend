import { NextResponse } from "next/server.js";
import { NetworkDecryptionError } from "./cipher.js";

export { NetworkDecryptionError };

export function toBadRequestResponse(error: unknown): NextResponse {
  if (error instanceof NetworkDecryptionError) {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
  }
  throw error;
}
