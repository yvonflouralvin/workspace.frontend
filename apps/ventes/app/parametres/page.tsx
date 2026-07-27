import { redirect } from "next/navigation";

// Les paramètres forment une seule page à deux colonnes : l'entrée du menu
// atterrit directement sur le premier réglage.
export default function ParametresPage() {
  redirect("/parametres/devise");
}
