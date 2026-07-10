"use client";

import Link from "next/link";
import { HotelOutlined } from "@mui/icons-material";

// Bandeau « patient hospitalisé » — discret, sous l'AllergyBanner (qui reste le seul à
// « crier »). Affiché partout où l'on ouvre le contexte d'un patient (dossier EMR,
// consultation) dès qu'un séjour est en cours.
export function HospitalisationBanner({ sejourId, admittedAt, serviceNom, chambreNumero, litNumero }: {
  sejourId: number;
  admittedAt: string | null;
  serviceNom: string | null;
  chambreNumero: string | null;
  litNumero: string | null;
}) {
  return (
    <Link href={`/surveillance/${sejourId}`}
      className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 hover:bg-primary/10 transition-colors">
      <HotelOutlined className="text-primary shrink-0" style={{ fontSize: 18 }} />
      <p className="text-body-sm text-on-surface">
        <span className="font-semibold text-primary">Patient hospitalisé</span>
        {admittedAt && ` — depuis le ${new Date(admittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
        {serviceNom ? ` · ${serviceNom}` : ""}
        {chambreNumero ? ` · chambre ${chambreNumero}` : ""}
        {litNumero ? ` · lit ${litNumero}` : ""}
      </p>
    </Link>
  );
}
