import { redirect } from "next/navigation";

/** L'ancien chemin du module, devenu « Agenda ».
 *
 *  Conservé en redirection : un lien collé dans une conversation ou un signet
 *  n'a pas à mourir parce qu'on a renommé un menu.
 */
export default function AncienCalendrier() {
  redirect("/agenda");
}
