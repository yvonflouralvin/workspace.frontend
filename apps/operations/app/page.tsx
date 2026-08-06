import { redirect } from "next/navigation";

// L'entrée de l'application est le module Planification — le seul aujourd'hui.
// Quand Operations en portera d'autres, cette page deviendra leur sommaire.
export default function AccueilPage() {
  redirect("/plannings");
}
