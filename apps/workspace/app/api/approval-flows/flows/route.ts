import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

// Le catalogue « formulaires à remplir » réunit deux mondes : les formulaires
// du module Formulaire et les circuits d'approbation. Chacun garde son moteur ;
// c'est la PORTE qui s'unifie.
export async function GET(request: NextRequest) {
  return forwardToBackend(request, APPROVAL_FLOWS_API_URL, "/approval-flows/flows");
}
