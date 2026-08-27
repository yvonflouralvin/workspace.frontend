"use client";

import { useEffect, useRef, useState } from "react";
import {
  AddOutlined,
  DeleteOutlineOutlined,
  FormatAlignCenterOutlined,
  FormatAlignJustifyOutlined,
  FormatAlignLeftOutlined,
  FormatAlignRightOutlined,
  KeyboardArrowDownOutlined,
  KeyboardArrowUpOutlined,
} from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { Switch } from "@repo/ui/Switch";

import type { Media } from "@/app/lib/api";
import type { Lien, RefMedia, Reglage } from "@repo/site-widgets/types";

export const CHAMP =
  "h-8 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const ICONES_ALIGNEMENT: Record<string, React.ReactNode> = {
  left: <FormatAlignLeftOutlined style={{ fontSize: 17 }} />,
  center: <FormatAlignCenterOutlined style={{ fontSize: 17 }} />,
  right: <FormatAlignRightOutlined style={{ fontSize: 17 }} />,
  justify: <FormatAlignJustifyOutlined style={{ fontSize: 17 }} />,
};

/** Une couleur vide veut dire « celle du thème », pas « transparent ».
 *  L'`<input type="color">` du navigateur n'a pas d'état vide : il faut donc
 *  un bouton explicite pour y revenir, sinon on ne peut plus jamais rendre la
 *  main au thème une fois qu'on a touché à la pastille. */
export function ChampCouleur({
  valeur,
  onChange,
  onFin,
}: {
  valeur: string;
  onChange: (v: string) => void;
  onFin?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={valeur || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onFin}
        className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-outline-soft bg-transparent"
      />
      <input
        className={CHAMP}
        value={valeur}
        placeholder="Couleur du thème"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onFin}
      />
      {valeur && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onFin?.();
          }}
          className="shrink-0 text-label-sm text-on-surface-variant hover:text-primary"
        >
          Défaut
        </button>
      )}
    </div>
  );
}

export function ChampNombre({
  reglage,
  valeur,
  onChange,
  onFin,
}: {
  reglage: Reglage;
  valeur: number;
  onChange: (v: number) => void;
  onFin?: () => void;
}) {
  const min = reglage.min ?? 0;
  const max = reglage.max ?? 100;
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={reglage.pas ?? 1}
        value={Number.isFinite(valeur) ? valeur : min}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onFin}
        className="h-1 flex-1 cursor-pointer accent-primary"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={reglage.pas ?? 1}
        value={Number.isFinite(valeur) ? valeur : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onFin}
        className="h-8 w-16 shrink-0 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-right text-body-sm text-on-surface outline-none focus:border-primary"
      />
      {reglage.unite && (
        <span className="w-5 shrink-0 text-label-sm text-on-surface-variant">{reglage.unite}</span>
      )}
    </div>
  );
}

/** Une dimension : un nombre ET son unité.
 *
 *  **Le nombre seul ne dit pas ce qu'il mesure.** 100 en pourcentage remplit la
 *  colonne, 100 en pixels tient dans une vignette. Imposer le pourcentage
 *  obligeait à contourner l'outil dès qu'une mise en page demandait des pixels
 *  — et rien ne permettait de le dire.
 *
 *  La glissière s'adapte à l'unité : 0–100 en pourcentage, 0–1200 en pixels,
 *  0–20 en em. Une glissière graduée en pixels sur une valeur en em serait
 *  inutilisable — un pas de 1 em traverserait toute la course.
 */
export interface DimensionValeur {
  valeur: number;
  unite: string;
}

const COURSES: Record<string, { max: number; pas: number }> = {
  "%": { max: 100, pas: 1 },
  px: { max: 1200, pas: 1 },
  em: { max: 20, pas: 0.1 },
  rem: { max: 20, pas: 0.1 },
  vh: { max: 100, pas: 1 },
  vw: { max: 100, pas: 1 },
};

export function ChampDimension({
  reglage,
  valeur,
  onChange,
  onFin,
}: {
  reglage: Reglage;
  valeur: unknown;
  onChange: (v: DimensionValeur) => void;
  onFin?: () => void;
}) {
  const unites = reglage.unites?.length ? reglage.unites : ["px", "%", "em"];
  const defautUnite = unites[0]!;

  // Tolère un nombre nu : les pages déjà publiées stockent `largeur_pct: 100`.
  const lu: DimensionValeur =
    typeof valeur === "number"
      ? { valeur, unite: defautUnite }
      : valeur && typeof valeur === "object"
        ? {
            valeur: Number((valeur as DimensionValeur).valeur ?? 0) || 0,
            unite: (valeur as DimensionValeur).unite || defautUnite,
          }
        : { valeur: Number(reglage.defaut ?? 0) || 0, unite: defautUnite };

  const course = COURSES[lu.unite] ?? { max: reglage.max ?? 100, pas: reglage.pas ?? 1 };
  const min = reglage.min ?? 0;
  // Le maximum du réglage ne vaut que pour SON unité d'origine : un « max: 100 »
  // pensé en pourcentage n'a aucun sens en pixels.
  const max = lu.unite === (reglage.unites?.[0] ?? "") ? (reglage.max ?? course.max) : course.max;

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={course.pas}
        value={Number.isFinite(lu.valeur) ? lu.valeur : min}
        onChange={(e) => onChange({ ...lu, valeur: Number(e.target.value) })}
        onPointerUp={onFin}
        className="h-1 flex-1 cursor-pointer accent-primary"
      />
      <input
        type="number"
        min={min}
        step={course.pas}
        value={Number.isFinite(lu.valeur) ? lu.valeur : ""}
        onChange={(e) => onChange({ ...lu, valeur: Number(e.target.value) })}
        onBlur={onFin}
        className="h-8 w-16 shrink-0 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-right text-body-sm text-on-surface outline-none focus:border-primary"
      />
      <select
        aria-label={`Unité de ${reglage.libelle}`}
        value={lu.unite}
        onChange={(e) => onChange({ ...lu, unite: e.target.value })}
        className="h-8 shrink-0 rounded-lg border border-outline-soft bg-surface-container-lowest px-1 text-label-md text-on-surface-variant outline-none focus:border-primary"
      >
        {unites.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface Espacement {
  unite?: string;
  haut?: number;
  droite?: number;
  bas?: number;
  gauche?: number;
}

const COTES: { cle: keyof Espacement; libelle: string }[] = [
  { cle: "haut", libelle: "Haut" },
  { cle: "droite", libelle: "Droite" },
  { cle: "bas", libelle: "Bas" },
  { cle: "gauche", libelle: "Gauche" },
];

export function ChampEspacement({
  valeur,
  onChange,
  onFin,
}: {
  valeur: Espacement;
  onChange: (v: Espacement) => void;
  onFin?: () => void;
}) {
  // Une seule unité pour les quatre côtés : des marges dont le haut serait en
  // em et la droite en pixels ne se règlent pas, elles se subissent.
  const unite = valeur?.unite || "px";

  return (
    <div className="flex items-end gap-1.5">
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {COTES.map((cote) => (
          <label key={cote.cle} className="block">
            <span className="block text-center text-label-sm text-on-surface-variant">
              {cote.libelle}
            </span>
            <input
              type="number"
              min={0}
              step={unite === "em" || unite === "rem" ? 0.1 : 1}
              value={valeur?.[cote.cle] ?? 0}
              onChange={(e) => onChange({ ...valeur, [cote.cle]: Number(e.target.value) })}
              onBlur={onFin}
              className="mt-0.5 h-8 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-1 text-center text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
        ))}
      </div>
      <select
        aria-label="Unité des marges"
        value={unite}
        onChange={(e) => onChange({ ...valeur, unite: e.target.value })}
        className="h-8 shrink-0 rounded-lg border border-outline-soft bg-surface-container-lowest px-1 text-label-md text-on-surface-variant outline-none focus:border-primary"
      >
        {["px", "em", "rem", "%"].map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ChampAlignement({
  reglage,
  valeur,
  onChange,
}: {
  reglage: Reglage;
  valeur: string;
  onChange: (v: string) => void;
}) {
  const options = reglage.options ?? [];
  return (
    <div className="inline-flex rounded-lg border border-outline-soft p-0.5">
      {options.map((option) => (
        <button
          key={option.valeur}
          type="button"
          title={option.libelle}
          onClick={() => onChange(option.valeur)}
          className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
            valeur === option.valeur
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          {ICONES_ALIGNEMENT[option.valeur] ?? option.libelle.slice(0, 1)}
        </button>
      ))}
    </div>
  );
}

export function ChampMedia({
  valeur,
  medias,
  urlMedia,
  onChange,
  onOuvrirBibliotheque,
}: {
  valeur: RefMedia | undefined;
  medias: Media[];
  urlMedia: (jeton: string) => string;
  onChange: (v: RefMedia | undefined) => void;
  onOuvrirBibliotheque: () => void;
}) {
  return (
    <div>
      {valeur?.jeton ? (
        <div className="flex items-center gap-2 rounded-lg border border-outline-soft p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlMedia(valeur.jeton)}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
            {medias.find((m) => m.jeton === valeur.jeton)?.nom ?? "Image"}
          </span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Retirer"
            className="shrink-0 text-on-surface-variant hover:text-error"
          >
            <DeleteOutlineOutlined style={{ fontSize: 18 }} />
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-outline-soft px-2 py-3 text-center text-body-sm text-on-surface-variant">
          Aucune image
        </p>
      )}
      <button
        type="button"
        onClick={onOuvrirBibliotheque}
        className="mt-1.5 h-8 w-full rounded-lg border border-outline-soft text-label-lg text-on-surface transition-colors hover:border-primary hover:text-primary"
      >
        {valeur?.jeton ? "Remplacer" : "Choisir une image"}
      </button>
    </div>
  );
}

export function ChampLien({
  valeur,
  pages,
  onChange,
}: {
  valeur: Lien | undefined;
  pages: { chemin: string; titre: string }[];
  onChange: (v: Lien | undefined) => void;
}) {
  const lien = valeur ?? {};
  const interne = Boolean(lien.page);

  return (
    <div className="space-y-1.5">
      <select
        className={CHAMP}
        value={interne ? (lien.page ?? "") : "__externe"}
        onChange={(e) => {
          const choix = e.target.value;
          if (choix === "__externe") onChange({ href: lien.href ?? "", nouvelOnglet: lien.nouvelOnglet });
          else if (choix === "") onChange(undefined);
          else onChange({ page: choix });
        }}
      >
        <option value="">Aucun lien</option>
        {pages.map((page) => (
          <option key={page.chemin} value={page.chemin}>
            {page.titre} ({page.chemin})
          </option>
        ))}
        <option value="__externe">Adresse externe…</option>
      </select>

      {!interne && valeur && (
        <>
          <input
            className={CHAMP}
            placeholder="https://exemple.cd"
            value={lien.href ?? ""}
            onChange={(e) => onChange({ ...lien, page: undefined, href: e.target.value })}
          />
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Switch
              checked={Boolean(lien.nouvelOnglet)}
              onChange={(v) => onChange({ ...lien, nouvelOnglet: v })}
            />
            Ouvrir dans un nouvel onglet
          </label>
        </>
      )}
    </div>
  );
}

/** Un champ de texte riche, DÉCOUPLÉ de l'état de l'éditeur.
 *
 *  `RichTextEditor` n'est pas contrôlé après son montage : lui renvoyer sa
 *  propre valeur à chaque frappe replacerait le curseur au début. On le monte
 *  donc une fois par nœud sélectionné (`key`) et on remonte les changements
 *  vers le haut, à l'inverse du sens habituel. */
export function ChampTexteRiche({
  valeur,
  onChange,
}: {
  valeur: unknown;
  onChange: (v: unknown) => void;
}) {
  const initial = useRef(JSON.stringify(valeur ?? []));
  return (
    <div className="rounded-lg border border-outline-soft">
      <RichTextEditor
        value={initial.current}
        toolbar
        onChange={(json) => {
          try {
            onChange(JSON.parse(json));
          } catch {
            /* un JSON illisible ne doit pas casser la frappe suivante */
          }
        }}
      />
    </div>
  );
}

export function ChampListe({
  reglage,
  valeur,
  onChange,
}: {
  reglage: Reglage;
  valeur: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
}) {
  const [ouvert, setOuvert] = useState<number | null>(0);
  const elements = Array.isArray(valeur) ? valeur : [];
  const sous = reglage.sousSchema ?? [];

  function modifier(index: number, patch: Record<string, unknown>) {
    onChange(elements.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-1.5">
      {elements.map((element, index) => (
        <div key={index} className="rounded-lg border border-outline-soft">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setOuvert(ouvert === index ? null : index)}
              className="min-w-0 flex-1 truncate text-left text-body-sm text-on-surface"
            >
              {String(element[reglage.cleLibelle ?? "texte"] ?? `Élément ${index + 1}`)}
            </button>
            <button
              type="button"
              title="Monter"
              disabled={index === 0}
              onClick={() => {
                const copie = [...elements];
                [copie[index - 1], copie[index]] = [copie[index]!, copie[index - 1]!];
                onChange(copie);
              }}
              className="text-on-surface-variant hover:text-primary disabled:opacity-30"
            >
              <KeyboardArrowUpOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              title="Descendre"
              disabled={index === elements.length - 1}
              onClick={() => {
                const copie = [...elements];
                [copie[index], copie[index + 1]] = [copie[index + 1]!, copie[index]!];
                onChange(copie);
              }}
              className="text-on-surface-variant hover:text-primary disabled:opacity-30"
            >
              <KeyboardArrowDownOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              title="Supprimer"
              onClick={() => onChange(elements.filter((_, i) => i !== index))}
              className="text-on-surface-variant hover:text-error"
            >
              <DeleteOutlineOutlined style={{ fontSize: 16 }} />
            </button>
          </div>

          {ouvert === index && (
            <div className="space-y-2 border-t border-outline-soft px-2 py-2">
              {sous.map((champ) => (
                <label key={champ.cle} className="block">
                  <span className="block text-label-sm text-on-surface-variant">
                    {champ.libelle}
                  </span>
                  <input
                    className={`${CHAMP} mt-0.5`}
                    value={String(element[champ.cle] ?? "")}
                    onChange={(e) => modifier(index, { [champ.cle]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          onChange([...elements, {}]);
          setOuvert(elements.length);
        }}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-outline-soft px-2 text-label-lg text-on-surface transition-colors hover:border-primary hover:text-primary"
      >
        <AddOutlined style={{ fontSize: 16 }} />
        Ajouter
      </button>
    </div>
  );
}

/** Focus le premier champ à l'ouverture d'un panneau. */
export function useAutoFocus<T extends HTMLElement>(actif: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (actif) ref.current?.focus();
  }, [actif]);
  return ref;
}
