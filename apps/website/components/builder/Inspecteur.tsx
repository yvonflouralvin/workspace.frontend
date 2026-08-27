"use client";

import { useMemo, useState } from "react";
import {
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  KeyboardArrowDownOutlined,
  KeyboardArrowUpOutlined,
} from "@mui/icons-material";
import { Icon } from "@repo/ui/Icon";
import { Switch } from "@repo/ui/Switch";

import { definition } from "@repo/site-widgets/catalogue";
import {
  aUneSurcharge,
  ascendance,
  decaler,
  dupliquer,
  modifierProps,
  modifierPropsReactives,
  retirerPropReactive,
  supprimer,
  trouver,
  valeurReactive,
} from "@repo/site-widgets/arbre";
import type { Appareil, Cible, Lien, Noeud, RefMedia, Reglage } from "@repo/site-widgets/types";

import type { Media } from "@/app/lib/api";
import { useBuilder } from "./store";
import {
  CHAMP,
  ChampAlignement,
  ChampCouleur,
  ChampDimension,
  ChampEspacement,
  ChampLien,
  ChampListe,
  ChampMedia,
  ChampNombre,
  ChampTexteRiche,
} from "./champs/Controles";

const GROUPES = [
  { cle: "contenu", libelle: "Contenu" },
  { cle: "style", libelle: "Style" },
  { cle: "avance", libelle: "Avancé" },
] as const;

/** Le panneau se GÉNÈRE à partir du schéma déclaré par chaque widget.
 *
 *  Coder un panneau par widget, c'est vingt fichiers qui divergent au premier
 *  réglage commun qu'on veut changer partout. Ici, ajouter un réglage à un
 *  widget est une ligne dans son schéma — et l'inspecteur le sait rendre.
 */
export function Inspecteur({
  medias,
  pages,
  urlMedia,
  onOuvrirBibliotheque,
}: {
  medias: Media[];
  pages: { chemin: string; titre: string }[];
  urlMedia: (jeton: string) => string;
  onOuvrirBibliotheque: (poser: (media: Media) => void) => void;
}) {
  const {
    arbre,
    selection,
    cible,
    appliquer,
    appliquerSansHistorique,
    jalonner,
    selectionner,
    viser,
  } = useBuilder();
  const [onglet, setOnglet] = useState<string>("contenu");

  const noeud = useMemo(
    () => (selection ? trouver(arbre, selection) : null),
    [arbre, selection],
  );
  const chemin = useMemo(
    () => (selection ? ascendance(arbre, selection) : []),
    [arbre, selection],
  );

  if (!noeud) {
    return (
      <div className="p-4">
        <p className="text-body-sm text-on-surface-variant">
          Cliquez sur un bloc de la page pour en régler le contenu et l&apos;apparence.
        </p>
      </div>
    );
  }

  const def = definition(noeud.type);
  if (!def) {
    return (
      <div className="p-4">
        <p className="text-body-sm text-error">Composant inconnu : « {noeud.type} ».</p>
      </div>
    );
  }

  const appareil: Appareil | null = cible === "bureau" ? null : cible;

  /** Écrire un réglage.
   *
   *  Quand on regarde le rendu mobile, on écrit la SURCHARGE mobile et non la
   *  valeur de base : c'est le comportement attendu d'un sélecteur d'appareil,
   *  et le contraire — changer le bureau depuis la vue mobile — est la
   *  surprise classique de ce genre d'outil. */
  function ecrire(cle: string, valeur: unknown, reglage: Reglage, continu = false) {
    const appliquerLe = continu ? appliquerSansHistorique : appliquer;
    if (appareil && reglage.reactif) {
      appliquerLe((a) => modifierPropsReactives(a, noeud!.id, appareil, { [cle]: valeur }));
    } else {
      appliquerLe((a) => modifierProps(a, noeud!.id, { [cle]: valeur }));
    }
  }

  function lire(cle: string): unknown {
    return valeurReactive(noeud!, cle, cible);
  }

  const visibles = def.schema.filter(
    (reglage) => !reglage.visibleSi || reglage.visibleSi(noeud.props ?? {}),
  );
  const parGroupe = GROUPES.map((groupe) => ({
    ...groupe,
    reglages: visibles.filter((r) => r.groupe === groupe.cle),
  })).filter((groupe) => groupe.reglages.length > 0);

  const ongletActif = parGroupe.some((g) => g.cle === onglet)
    ? onglet
    : (parGroupe[0]?.cle ?? "contenu");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-outline-soft px-3 py-2">
        {/* Le fil d'Ariane : sans lui, on ne sait pas remonter d'un widget à
            sa colonne, et régler la section devient une chasse au clic. */}
        <nav className="flex flex-wrap items-center gap-1 text-label-sm text-on-surface-variant">
          {chemin.map((etape, i) => (
            <span key={etape.id} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-50">›</span>}
              <button
                type="button"
                onClick={() => selectionner(etape.id === arbre.id ? null : etape.id)}
                className={i === chemin.length - 1 ? "text-on-surface" : "hover:text-primary"}
              >
                {definition(etape.type)?.libelle ?? (etape.type === "racine" ? "Page" : etape.type)}
              </button>
            </span>
          ))}
        </nav>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-title-sm text-on-surface">{def.libelle}</p>
          <div className="flex items-center gap-0.5">
            <BoutonOutil
              titre="Monter"
              onClick={() => appliquer((a) => decaler(a, noeud.id, -1))}
              icone={<KeyboardArrowUpOutlined style={{ fontSize: 18 }} />}
            />
            <BoutonOutil
              titre="Descendre"
              onClick={() => appliquer((a) => decaler(a, noeud.id, 1))}
              icone={<KeyboardArrowDownOutlined style={{ fontSize: 18 }} />}
            />
            <BoutonOutil
              titre="Dupliquer"
              onClick={() => appliquer((a) => dupliquer(a, noeud.id))}
              icone={<ContentCopyOutlined style={{ fontSize: 16 }} />}
            />
            <BoutonOutil
              titre="Supprimer"
              danger
              onClick={() => {
                appliquer((a) => supprimer(a, noeud.id));
                selectionner(null);
              }}
              icone={<DeleteOutlineOutlined style={{ fontSize: 18 }} />}
            />
          </div>
        </div>

        {appareil && (
          <p className="mt-2 rounded-lg bg-secondary/10 px-2 py-1 text-label-sm text-secondary">
            Vous réglez la vue {appareil}. Les réglages marqués d&apos;un point ne changeront que
            là.
          </p>
        )}
      </div>

      {parGroupe.length > 1 && (
        // Une barre d'onglets locale plutôt que `@repo/ui/Tabs` : ce composant
        // rend LUI-MÊME le contenu de l'onglet actif, alors qu'ici le contenu
        // doit défiler dans un conteneur séparé qui occupe la hauteur restante.
        <div className="flex gap-1 border-b border-outline-soft px-2 pt-2">
          {parGroupe.map((groupe) => (
            <button
              key={groupe.cle}
              type="button"
              onClick={() => setOnglet(groupe.cle)}
              className={`h-8 rounded-t-lg px-2.5 text-label-lg transition-colors ${
                ongletActif === groupe.cle
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {groupe.libelle}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-3">
        {(parGroupe.find((g) => g.cle === ongletActif)?.reglages ?? []).map((reglage) => (
          <div key={reglage.cle}>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-label-sm text-on-surface-variant">{reglage.libelle}</span>
              {reglage.reactif && (
                <BarreAppareils
                  noeud={noeud}
                  cle={reglage.cle}
                  cible={cible}
                  onViser={viser}
                  onReinitialiser={
                    appareil && aUneSurcharge(noeud, reglage.cle, appareil)
                      ? () =>
                          appliquer((a) =>
                            retirerPropReactive(a, noeud.id, appareil, reglage.cle),
                          )
                      : null
                  }
                />
              )}
            </div>
            <Controle
              reglage={reglage}
              valeur={lire(reglage.cle)}
              medias={medias}
              pages={pages}
              urlMedia={urlMedia}
              onOuvrirBibliotheque={() =>
                onOuvrirBibliotheque((media) =>
                  ecrire(
                    reglage.cle,
                    {
                      jeton: media.jeton,
                      alt: media.alt ?? "",
                      largeur: media.largeur,
                      hauteur: media.hauteur,
                    } satisfies RefMedia,
                    reglage,
                  ),
                )
              }
              onChange={(v, continu) => ecrire(reglage.cle, v, reglage, continu)}
              onFin={jalonner}
              cleRendu={`${noeud.id}:${reglage.cle}`}
            />
            {reglage.aide && (
              <p className="mt-1 text-label-sm text-on-surface-variant opacity-80">{reglage.aide}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoutonOutil({
  titre,
  onClick,
  icone,
  danger,
}: {
  titre: string;
  onClick: () => void;
  icone: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={titre}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container ${
        danger ? "hover:text-error" : "hover:text-primary"
      }`}
    >
      {icone}
    </button>
  );
}

function Controle({
  reglage,
  valeur,
  medias,
  pages,
  urlMedia,
  onChange,
  onFin,
  onOuvrirBibliotheque,
  cleRendu,
}: {
  reglage: Reglage;
  valeur: unknown;
  medias: Media[];
  pages: { chemin: string; titre: string }[];
  urlMedia: (jeton: string) => string;
  onChange: (v: unknown, continu?: boolean) => void;
  onFin: () => void;
  onOuvrirBibliotheque: () => void;
  cleRendu: string;
}) {
  // Un `switch` sur le type de contrôle, et un composant par type — la forme
  // déjà retenue ailleurs dans le dépôt pour les questionnaires. Une chaîne de
  // ternaires ne tient pas à vingt types de contrôle.
  switch (reglage.type) {
    case "texte":
      return (
        <input
          className={CHAMP}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => onChange(e.target.value, true)}
          onBlur={onFin}
        />
      );

    case "texte_long":
      return (
        <textarea
          rows={3}
          className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => onChange(e.target.value, true)}
          onBlur={onFin}
        />
      );

    case "texte_riche":
      return <ChampTexteRiche key={cleRendu} valeur={valeur} onChange={(v) => onChange(v, true)} />;

    case "nombre":
      return (
        <ChampNombre
          reglage={reglage}
          valeur={typeof valeur === "number" ? valeur : Number(valeur ?? 0)}
          onChange={(v) => onChange(v, true)}
          onFin={onFin}
        />
      );

    case "dimension":
      return (
        <ChampDimension
          reglage={reglage}
          valeur={valeur}
          onChange={(v) => onChange(v, true)}
          onFin={onFin}
        />
      );

    case "booleen":
      return (
        <Switch checked={Boolean(valeur)} onChange={(v) => onChange(v)} label={reglage.libelle} />
      );

    case "couleur":
      return (
        <ChampCouleur
          valeur={typeof valeur === "string" ? valeur : ""}
          onChange={(v) => onChange(v, true)}
          onFin={onFin}
        />
      );

    case "choix":
      return (
        <select
          className={CHAMP}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(reglage.options ?? []).map((option) => (
            <option key={option.valeur} value={option.valeur}>
              {option.libelle}
            </option>
          ))}
        </select>
      );

    case "alignement":
      return (
        <ChampAlignement
          reglage={reglage}
          valeur={typeof valeur === "string" ? valeur : ""}
          onChange={(v) => onChange(v)}
        />
      );

    case "espacement":
      return (
        <ChampEspacement
          valeur={(valeur ?? {}) as Record<string, number>}
          onChange={(v) => onChange(v, true)}
          onFin={onFin}
        />
      );

    case "media":
      return (
        <ChampMedia
          valeur={valeur as RefMedia | undefined}
          medias={medias}
          urlMedia={urlMedia}
          onChange={(v) => onChange(v)}
          onOuvrirBibliotheque={onOuvrirBibliotheque}
        />
      );

    case "lien":
      return (
        <ChampLien
          valeur={valeur as Lien | undefined}
          pages={pages}
          onChange={(v) => onChange(v)}
        />
      );

    case "icone":
      return (
        <input
          className={CHAMP}
          placeholder="check_circle"
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => onChange(e.target.value, true)}
          onBlur={onFin}
        />
      );

    case "liste":
      return (
        <ChampListe
          reglage={reglage}
          valeur={Array.isArray(valeur) ? (valeur as Record<string, unknown>[]) : []}
          onChange={(v) => onChange(v)}
        />
      );

    default:
      return (
        <input
          className={CHAMP}
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => onChange(e.target.value, true)}
          onBlur={onFin}
        />
      );
  }
}

/** Les trois écrans, à côté du réglage qui peut différer selon l'appareil.
 *
 *  **Le sélecteur d'appareil de la barre du haut ne suffisait pas.** Il change
 *  la largeur du canevas ; rien ne disait que l'inspecteur écrivait alors une
 *  surcharge, ni lesquels des trois écrans portaient déjà une valeur propre.
 *  On voyait donc un réglage « à 100 % » sans savoir s'il valait 100 % partout
 *  ou seulement ici.
 *
 *  Un point plein marque un écran qui a SA valeur. Cliquer bascule le canevas :
 *  régler le mobile sans le regarder n'a aucun sens.
 */
function BarreAppareils({
  noeud,
  cle,
  cible,
  onViser,
  onReinitialiser,
}: {
  noeud: Noeud;
  cle: string;
  cible: Cible;
  onViser: (c: Cible) => void;
  onReinitialiser: (() => void) | null;
}) {
  const ECRANS: { cle: Cible; libelle: string; icone: string }[] = [
    { cle: "bureau", libelle: "Bureau", icone: "desktop_windows" },
    { cle: "tablette", libelle: "Tablette", icone: "tablet_mac" },
    { cle: "mobile", libelle: "Mobile", icone: "phone_iphone" },
  ];

  return (
    <span className="ml-auto flex items-center gap-0.5">
      {ECRANS.map((ecran) => {
        const propre =
          ecran.cle !== "bureau" && aUneSurcharge(noeud, cle, ecran.cle as Appareil);
        return (
          <button
            key={ecran.cle}
            type="button"
            title={
              propre
                ? `${ecran.libelle} — valeur propre à cet écran`
                : `${ecran.libelle} — valeur héritée`
            }
            aria-pressed={cible === ecran.cle}
            onClick={() => onViser(ecran.cle)}
            className={`relative flex h-5 w-5 items-center justify-center rounded transition-colors ${
              cible === ecran.cle
                ? "bg-primary text-on-primary"
                : "text-outline hover:bg-surface-container"
            }`}
          >
            <Icon name={ecran.icone} className="text-[13px]" />
            {propre && (
              <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-secondary" />
            )}
          </button>
        );
      })}
      {onReinitialiser && (
        <button
          type="button"
          title="Revenir à la valeur héritée sur cet écran"
          aria-label="Revenir à la valeur héritée"
          onClick={onReinitialiser}
          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-outline transition-colors hover:bg-surface-container hover:text-error"
        >
          <Icon name="restart_alt" className="text-[13px]" />
        </button>
      )}
    </span>
  );
}

export type { Noeud };
