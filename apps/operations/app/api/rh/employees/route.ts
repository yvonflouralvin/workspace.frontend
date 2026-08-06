import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

// Lecture SEULE de l'annuaire RH, pour choisir qui devient une ressource
// planifiable. Operations ne modifie jamais une fiche employé : RH en reste
// propriétaire, et la permission `hr.employees.view` de l'utilisateur décide.
const HR_API_URL = process.env.HR_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, HR_API_URL, "/hr/employees");
}
