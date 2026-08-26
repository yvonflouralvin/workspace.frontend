import { apiFetch } from "@repo/network/client";
import type { Noeud, Theme } from "@repo/site-widgets/types";

/** Le client de Website. Tout passe par le BFF chiffré de l'app, sauf les
 *  octets — médias et téléversements — qui empruntent `/api/website-fichiers`
 *  parce que le relais chiffré ne transporte que du JSON. */

export interface Site {
  id: number;
  workspace_id: number;
  nom: string;
  slug: string;
  etat: "BROUILLON" | "EN_LIGNE" | "SUSPENDU";
  langue: string;
  theme_brouillon: Theme;
  theme_publie: Theme | null;
  entete_brouillon: Noeud | null;
  entete_publie: Noeud | null;
  pied_brouillon: Noeud | null;
  pied_publie: Noeud | null;
  favicon_media_id: number | null;
  publie_le: string | null;
  created_at: string;
  updated_at: string;
  adresse: string | null;
  pages_a_publier: number;
}

export interface PageSite {
  id: number;
  workspace_id: number;
  site_id: number;
  chemin: string;
  titre: string;
  description: string | null;
  image_og_media_id: number | null;
  indexable: boolean;
  est_accueil: boolean;
  position: number;
  revision: number;
  version_publiee_id: number | null;
  created_at: string;
  updated_at: string;
  a_des_modifications: boolean;
}

export interface PageDetail extends PageSite {
  arbre_brouillon: Noeud;
}

export interface Version {
  id: number;
  numero: number;
  titre: string;
  description: string | null;
  resume: string | null;
  publie_par: number | null;
  created_at: string;
  est_en_ligne: boolean;
}

export interface Media {
  id: number;
  site_id: number;
  jeton: string;
  nom: string;
  type_mime: string;
  octets: number;
  largeur: number | null;
  hauteur: number | null;
  alt: string | null;
  created_at: string;
  url: string;
  pages: number;
}

export interface InstructionDns {
  type: string;
  nom: string;
  valeur: string;
  role: string;
}

export interface Domaine {
  id: number;
  site_id: number;
  hote: string;
  type: "PLATEFORME" | "CUSTOM";
  principal: boolean;
  etat: "EN_ATTENTE" | "VERIFIE" | "ACTIF" | "ERREUR";
  jeton_verif: string;
  verifie_le: string | null;
  dernier_controle_le: string | null;
  derniere_erreur: string | null;
  cert_etat: string | null;
  cert_expire_le: string | null;
  instructions: InstructionDns[];
  adresse: string | null;
}

// ── Boutique ───────────────────────────────────────────────────────────────
//
// Les montants voyagent en CENTIMES, jamais en unités décimales. Un `float` qui
// vaut 19.99 vaut en réalité 19.989999999999998 : cent lignes de panier
// produisent un total faux d'un centime que personne ne sait expliquer.

export interface Variante {
  id?: number;
  libelle: string | null;
  sku: string | null;
  prix_centimes: number;
  prix_barre_centimes: number | null;
  devise: string;
  stock: number | null;
  poids_grammes: number | null;
  position: number;
  actif: boolean;
}

export type EtatProduit = "BROUILLON" | "EN_VENTE" | "EPUISE" | "RETIRE";

export interface Produit {
  id: number;
  site_id: number;
  categorie_id: number | null;
  categorie_nom: string | null;
  nom: string;
  slug: string;
  resume: string | null;
  description: unknown[] | null;
  etat: EtatProduit;
  images: string[];
  ventes_produit_id: number | null;
  meta_titre: string | null;
  meta_description: string | null;
  position: number;
  variantes: Variante[];
  prix_min_centimes: number | null;
  prix_max_centimes: number | null;
  devise: string;
  disponible: boolean;
}

export interface CategorieProduit {
  id: number;
  site_id: number;
  parent_id: number | null;
  nom: string;
  slug: string;
  description: string | null;
  image_media_id: number | null;
  position: number;
  visible: boolean;
  produits: number;
}

export const ETATS_PRODUIT: Record<EtatProduit, string> = {
  BROUILLON: "Brouillon",
  EN_VENTE: "En vente",
  EPUISE: "Épuisé — visible, pas achetable",
  RETIRE: "Retiré de la vitrine",
};

/** Centimes → « 19,99 $ ». Une seule conversion, au bord de l'écran. */
export function montant(centimes: number | null | undefined, devise = "USD"): string {
  if (centimes === null || centimes === undefined) return "—";
  const signe = devise === "USD" ? "$" : devise === "EUR" ? "€" : devise;
  return `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${signe}`;
}

export interface LigneCommande {
  produit_nom: string;
  variante_libelle: string | null;
  prix_unitaire_centimes: number;
  quantite: number;
  total_centimes: number;
}

export type StatutCommande = "RECUE" | "PAYEE" | "EXPEDIEE" | "LIVREE" | "ANNULEE";

export interface Commande {
  id: number;
  reference: string;
  statut: StatutCommande;
  statut_libelle: string;
  email: string;
  nom: string;
  telephone: string | null;
  adresse_livraison: string | null;
  note: string | null;
  total_centimes: number;
  devise: string;
  lignes: LigneCommande[];
  client_id: number | null;
  ventes_commande_id: number | null;
  created_at: string;
}

export interface ClientBoutique {
  id: number;
  email: string;
  nom: string | null;
  telephone: string | null;
  actif: boolean;
  derniere_connexion_le: string | null;
  created_at: string;
  commandes: number;
}

export interface Abonne {
  id: number;
  email: string;
  nom: string | null;
  source: string | null;
  actif: boolean;
  created_at: string;
}

export const STATUTS_COMMANDE: Record<StatutCommande, string> = {
  RECUE: "Reçue",
  PAYEE: "Payée",
  EXPEDIEE: "Expédiée",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

export interface Apercu {
  jeton: string;
  url: string;
  expire_le: number;
}

export const ETATS_SITE: Record<Site["etat"], string> = {
  BROUILLON: "Brouillon",
  EN_LIGNE: "En ligne",
  SUSPENDU: "Suspendu",
};

async function lire<T>(reponse: Response): Promise<T> {
  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => ({}));
    throw new Error(
      typeof corps?.detail === "string" ? corps.detail : `Erreur ${reponse.status}`,
    );
  }
  if (reponse.status === 204) return undefined as T;
  return (await reponse.json()) as T;
}

const base = "/api/website";
const octets = "/api/website-fichiers";

/** L'URL par laquelle le canevas de l'éditeur voit un média.
 *
 *  Différente de celle du site publié (`/_media/<jeton>`) : ici on passe par
 *  le BFF, qui porte le secret interne. C'est exactement pour ça que
 *  `urlMedia` est injecté dans le contexte de rendu au lieu d'être en dur
 *  dans les widgets. */
export function urlMediaEditeur(jeton: string): string {
  return `${octets}/public/medias/${jeton}`;
}

/** Levée quand le serveur refuse une sauvegarde parce que la page a bougé
 *  ailleurs. Un type dédié parce que l'éditeur doit la traiter autrement
 *  qu'une panne : il ne réessaie pas, il demande à recharger. */
export class ConflitRevision extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflitRevision";
  }
}

export const api = {
  // ── Sites ────────────────────────────────────────────────────────────────
  sites: () => apiFetch(`${base}/sites`).then((r) => lire<Site[]>(r)),
  site: (id: number) => apiFetch(`${base}/sites/${id}`).then((r) => lire<Site>(r)),
  creerSite: (corps: { nom: string; slug?: string; langue?: string }) =>
    apiFetch(`${base}/sites`, { method: "POST", body: corps }).then((r) => lire<Site>(r)),
  modifierSite: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/sites/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Site>(r),
    ),
  supprimerSite: (id: number) =>
    apiFetch(`${base}/sites/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),
  publierSite: (id: number, resume?: string) =>
    apiFetch(`${base}/sites/${id}/publier`, {
      method: "POST",
      body: { resume: resume ?? null },
    }).then((r) => lire<Site>(r)),
  suspendreSite: (id: number) =>
    apiFetch(`${base}/sites/${id}/suspendre`, { method: "POST" }).then((r) => lire<Site>(r)),
  reprendreSite: (id: number) =>
    apiFetch(`${base}/sites/${id}/reprendre`, { method: "POST" }).then((r) => lire<Site>(r)),

  // ── Pages ────────────────────────────────────────────────────────────────
  pages: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/pages`).then((r) => lire<PageSite[]>(r)),
  creerPage: (siteId: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/sites/${siteId}/pages`, { method: "POST", body: corps }).then((r) =>
      lire<PageDetail>(r),
    ),
  page: (id: number) => apiFetch(`${base}/pages/${id}`).then((r) => lire<PageDetail>(r)),
  modifierPage: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/pages/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<PageSite>(r),
    ),
  supprimerPage: (id: number) =>
    apiFetch(`${base}/pages/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  enregistrerBrouillon: async (id: number, arbre: Noeud, revision: number) => {
    const reponse = await apiFetch(`${base}/pages/${id}/brouillon`, {
      method: "PUT",
      body: { arbre, revision },
    });
    if (reponse.status === 409) {
      const corps = await reponse.json().catch(() => ({}));
      throw new ConflitRevision(
        typeof corps?.detail === "string"
          ? corps.detail
          : "Cette page a été modifiée ailleurs.",
      );
    }
    return lire<{ revision: number; enregistre_le: string }>(reponse);
  },

  publierPage: (id: number, resume?: string) =>
    apiFetch(`${base}/pages/${id}/publier`, {
      method: "POST",
      body: { resume: resume ?? null },
    }).then((r) => lire<PageSite>(r)),
  versions: (id: number) =>
    apiFetch(`${base}/pages/${id}/versions`).then((r) => lire<Version[]>(r)),
  restaurer: (id: number, versionId: number) =>
    apiFetch(`${base}/pages/${id}/restaurer/${versionId}`, { method: "POST" }).then((r) =>
      lire<PageDetail>(r),
    ),
  apercu: (id: number) =>
    apiFetch(`${base}/pages/${id}/apercu`, { method: "POST" }).then((r) => lire<Apercu>(r)),

  // ── Boutique ─────────────────────────────────────────────────────────────
  categories: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/categories`).then((r) => lire<CategorieProduit[]>(r)),
  creerCategorie: (siteId: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/sites/${siteId}/categories`, { method: "POST", body: corps }).then((r) =>
      lire<CategorieProduit>(r),
    ),
  modifierCategorie: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/categories/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<CategorieProduit>(r),
    ),
  supprimerCategorie: (id: number) =>
    apiFetch(`${base}/categories/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  produits: (siteId: number, filtres: Record<string, string> = {}) => {
    const q = new URLSearchParams(filtres).toString();
    return apiFetch(`${base}/sites/${siteId}/produits${q ? `?${q}` : ""}`).then((r) =>
      lire<Produit[]>(r),
    );
  },
  produit: (id: number) => apiFetch(`${base}/produits/${id}`).then((r) => lire<Produit>(r)),
  creerProduit: (siteId: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/sites/${siteId}/produits`, { method: "POST", body: corps }).then((r) =>
      lire<Produit>(r),
    ),
  modifierProduit: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/produits/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Produit>(r),
    ),
  poserVariantes: (id: number, variantes: Partial<Variante>[]) =>
    apiFetch(`${base}/produits/${id}/variantes`, { method: "PUT", body: variantes }).then((r) =>
      lire<Produit>(r),
    ),
  supprimerProduit: (id: number) =>
    apiFetch(`${base}/produits/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // ── Commandes, clients, abonnés ──────────────────────────────────────────
  commandes: (siteId: number, statut?: string) =>
    apiFetch(`${base}/sites/${siteId}/commandes${statut ? `?statut=${statut}` : ""}`).then((r) =>
      lire<Commande[]>(r),
    ),
  changerStatutCommande: (id: number, statut: string) =>
    apiFetch(`${base}/commandes/${id}`, { method: "PATCH", body: { statut } }).then((r) =>
      lire<Commande>(r),
    ),
  clientsBoutique: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/clients`).then((r) => lire<ClientBoutique[]>(r)),
  abonnes: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/abonnes`).then((r) => lire<Abonne[]>(r)),

  // ── Domaines ─────────────────────────────────────────────────────────────
  domaines: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/domaines`).then((r) => lire<Domaine[]>(r)),
  attacherDomaine: (siteId: number, hote: string) =>
    apiFetch(`${base}/sites/${siteId}/domaines`, { method: "POST", body: { hote } }).then((r) =>
      lire<Domaine>(r),
    ),
  verifierDomaine: (id: number) =>
    apiFetch(`${base}/domaines/${id}/verifier`, { method: "POST" }).then((r) => lire<Domaine>(r)),
  domainePrincipal: (id: number) =>
    apiFetch(`${base}/domaines/${id}/principal`, { method: "POST" }).then((r) => lire<Domaine>(r)),
  detacherDomaine: (id: number) =>
    apiFetch(`${base}/domaines/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // ── Médias ───────────────────────────────────────────────────────────────
  medias: (siteId: number) =>
    apiFetch(`${base}/sites/${siteId}/medias`).then((r) => lire<Media[]>(r)),
  modifierMedia: (id: number, corps: { nom?: string; alt?: string }) =>
    apiFetch(`${base}/medias/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Media>(r),
    ),
  supprimerMedia: (id: number, force = false) =>
    apiFetch(`${base}/medias/${id}${force ? "?force=true" : ""}`, {
      method: "DELETE",
    }).then((r) => lire<void>(r)),

  /** Téléversement avec avancement.
   *
   *  `XMLHttpRequest` et non `fetch` : `fetch` ne sait pas rendre compte de
   *  l'avancement de l'ENVOI. Sur une image de plusieurs mégaoctets et une
   *  connexion lente, une barre qui n'avance pas est indiscernable d'une
   *  application figée. */
  televerserMedia: (
    siteId: number,
    fichier: File,
    onProgres?: (pourcent: number) => void,
  ): Promise<Media> =>
    new Promise((resoudre, rejeter) => {
      const formulaire = new FormData();
      formulaire.append("fichier", fichier);

      const requete = new XMLHttpRequest();
      requete.open("POST", `${octets}/sites/${siteId}/medias`);
      requete.withCredentials = true;

      requete.upload.onprogress = (evenement) => {
        if (evenement.lengthComputable && onProgres) {
          onProgres(Math.round((evenement.loaded / evenement.total) * 100));
        }
      };
      requete.onload = () => {
        let corps: { detail?: string } = {};
        try {
          corps = JSON.parse(requete.responseText);
        } catch {
          corps = {};
        }
        if (requete.status >= 200 && requete.status < 300) resoudre(corps as unknown as Media);
        else rejeter(new Error(corps.detail ?? `Erreur ${requete.status}`));
      };
      requete.onerror = () => rejeter(new Error("Le téléversement a échoué."));
      requete.send(formulaire);
    }),
};
