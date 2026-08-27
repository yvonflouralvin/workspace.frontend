import type { Theme } from "./types";

/** Le thème d'un site devient des VARIABLES CSS, distinctes des jetons du
 *  design system de la plateforme.
 *
 *  Un site client ne doit pas hériter du bleu de la plateforme. C'est pour
 *  cela que l'app de rendu importe Tailwind mais PAS `design-system/tokens.css` —
 *  la seule app du dépôt dans ce cas. */
export const THEME_DEFAUT: Required<Theme> = {
  primaire: "#3525cd",
  secondaire: "#0f172a",
  fond: "#ffffff",
  texte: "#111827",
  texte_doux: "#6b7280",
  police_titre: "Inter, system-ui, -apple-system, sans-serif",
  police_texte: "Inter, system-ui, -apple-system, sans-serif",
  rayon: 12,
  largeur_contenu: 1140,
};

export function variablesTheme(theme: Theme | null | undefined): Record<string, string> {
  const t = { ...THEME_DEFAUT, ...(theme ?? {}) };
  return {
    "--site-primaire": t.primaire,
    "--site-secondaire": t.secondaire,
    "--site-fond": t.fond,
    "--site-texte": t.texte,
    "--site-texte-doux": t.texte_doux,
    "--site-police-titre": t.police_titre,
    "--site-police-texte": t.police_texte,
    "--site-rayon": `${t.rayon}px`,
    "--site-largeur": `${t.largeur_contenu}px`,
  };
}

export interface Espacement {
  /** L'unité des quatre côtés. Une seule pour les quatre : des marges dont le
   *  haut est en em et la droite en pixels ne se règlent pas, elles se
   *  subissent. */
  unite?: string;
  haut?: number;
  droite?: number;
  bas?: number;
  gauche?: number;
}

export function versPadding(valeur: unknown): string | undefined {
  if (typeof valeur === "number") return `${valeur}px`;
  if (!valeur || typeof valeur !== "object") return undefined;
  const e = valeur as Espacement;
  // `unite` est facultative : les documents déjà publiés n'en portent pas, et
  // ils sont en pixels.
  const u = typeof e.unite === "string" && e.unite ? e.unite : "px";
  return `${e.haut ?? 0}${u} ${e.droite ?? 0}${u} ${e.bas ?? 0}${u} ${e.gauche ?? 0}${u}`;
}

export interface Dimension {
  valeur: number;
  unite: string;
}

/** Une dimension en CSS — « 100% », « 24px », « 1.5em ».
 *
 *  **Tolère un nombre nu**, et c'est indispensable : les pages déjà publiées
 *  stockent `largeur_pct: 100`, sans unité. Refuser ce format casserait tout
 *  site existant à la première lecture ; le convertir en base obligerait à une
 *  migration de documents JSON pour un gain nul.
 */
export function versDimension(
  valeur: unknown,
  defaut: { valeur: number; unite: string },
): string {
  if (typeof valeur === "number" && Number.isFinite(valeur)) {
    return `${valeur}${defaut.unite}`;
  }
  if (valeur && typeof valeur === "object") {
    const d = valeur as Partial<Dimension>;
    const n = typeof d.valeur === "number" && Number.isFinite(d.valeur) ? d.valeur : defaut.valeur;
    const u = typeof d.unite === "string" && d.unite ? d.unite : defaut.unite;
    return `${n}${u}`;
  }
  return `${defaut.valeur}${defaut.unite}`;
}

/** La partie numérique d'une dimension — pour les rares calculs qui en ont
 *  besoin (le plafonnement d'une largeur de colonne en pourcentage). */
export function valeurDimension(valeur: unknown, defaut: number): number {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return valeur;
  if (valeur && typeof valeur === "object") {
    const n = (valeur as Partial<Dimension>).valeur;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return defaut;
}

export function uniteDimension(valeur: unknown, defaut: string): string {
  if (valeur && typeof valeur === "object") {
    const u = (valeur as Partial<Dimension>).unite;
    if (typeof u === "string" && u) return u;
  }
  return defaut;
}

export function nombre(valeur: unknown, defaut: number): number {
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  return typeof n === "number" && Number.isFinite(n) ? n : defaut;
}

export function texte(valeur: unknown, defaut = ""): string {
  return typeof valeur === "string" ? valeur : defaut;
}

export function booleen(valeur: unknown, defaut = false): boolean {
  return typeof valeur === "boolean" ? valeur : defaut;
}
