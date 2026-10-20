import { domaineDepose } from "@repo/network/config";

/** Où pointent « Se connecter » et « Essayer gratuitement ».
 *
 *  Une FONCTION et non une constante de module : la valeur vient de
 *  `<ConfigGlobale>`, posée à l'analyse du document. Une constante serait
 *  évaluée au chargement du chunk, parfois avant le script — et une image
 *  construite une fois figerait de toute façon un `NEXT_PUBLIC_*`. */
export function lienAuth(chemin = ""): string {
  return `${domaineDepose("auth") ?? "http://localhost:3001"}${chemin}`;
}

export const navLinks = [
  { href: "/produits", label: "Produits" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];
