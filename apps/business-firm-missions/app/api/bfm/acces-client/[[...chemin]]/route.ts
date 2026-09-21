import { NextRequest } from "next/server";
import { relayer } from "@/lib/relais";

type Contexte = { params: Promise<{ chemin?: string[] }> };

const relais = async (request: NextRequest, { params }: Contexte) =>
  relayer(request, "acces-client", (await params).chemin);

export { relais as GET, relais as POST, relais as PATCH, relais as PUT, relais as DELETE };
