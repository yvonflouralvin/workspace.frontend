"use client";

import { useMemo, useState } from "react";
import { Icon } from "@repo/ui/Icon";

import { definition } from "@repo/site-widgets/catalogue";
import {
  depotPermis,
  deplacer,
  modifierNoeud,
  parent,
  trouver,
} from "@repo/site-widgets/arbre";
import type { Noeud } from "@repo/site-widgets/types";

import { useBuilder } from "./store";

/** La structure de la page — et le seul endroit d'où l'on peut tout atteindre.
 *
 *  Le canevas suffit tant que les blocs sont visibles ; il ne suffit plus dès
 *  qu'un bloc est vide, transparent, ou caché derrière un autre.
 *
 *  Trois choses la rendent utilisable sur une vraie page :
 *
 *  - **on replie.** Une page de cent blocs entièrement dépliée est une liste
 *    qu'on parcourt à la molette, pas une structure qu'on lit.
 *  - **on cherche.** Le nom d'un bloc est ce qu'on retient de lui ; retrouver
 *    « le bouton du bandeau » en dépliant six sections est un travail d'archive.
 *  - **on renomme.** « Section 7 » ne dit rien. « Bandeau d'accueil » se
 *    retrouve du premier coup, et c'est la seule information que l'outil ne
 *    peut pas deviner.
 *
 *  Le **glisser-déposer** utilise l'API native du navigateur : une liste
 *  imbriquée avec des zones d'insertion est exactement ce que `dragover`/`drop`
 *  savent faire. Contrepartie connue — cela ne fonctionne pas au doigt ; le
 *  builder est un outil de bureau, et les flèches de l'inspecteur restent là.
 */

type Position = "avant" | "dedans" | "apres";

export function Arborescence() {
  const { arbre, selection, selectionner, appliquer } = useBuilder();
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<{ id: string; position: Position } | null>(null);
  const [replies, setReplies] = useState<Set<string>>(() => new Set());
  const [recherche, setRecherche] = useState("");
  const [renomme, setRenomme] = useState<string | null>(null);

  const terme = recherche.trim().toLowerCase();

  /** Les identifiants à montrer quand une recherche est en cours : ceux qui
   *  correspondent, ET leurs ancêtres — un résultat sans son chemin ne dit pas
   *  où il se trouve. */
  const filtres = useMemo(() => {
    if (!terme) return null;
    const gardes = new Set<string>();
    const visiter = (noeud: Noeud, ancetres: string[]): void => {
      if (etiquetteDe(noeud, 0).toLowerCase().includes(terme)) {
        gardes.add(noeud.id);
        for (const a of ancetres) gardes.add(a);
      }
      for (const enfant of noeud.enfants ?? []) visiter(enfant, [...ancetres, noeud.id]);
    };
    visiter(arbre, []);
    return gardes;
  }, [arbre, terme]);

  function basculer(id: string) {
    setReplies((r) => {
      const suivant = new Set(r);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  /** Sélectionner ET amener le bloc sous les yeux.
   *
   *  Sélectionner sans faire défiler laisse l'inspecteur régler un bloc qu'on
   *  ne voit pas — on modifie alors à l'aveugle, et on annule pour comprendre. */
  function atteindre(id: string) {
    selectionner(id);
    if (typeof document === "undefined") return;
    const cible = document.querySelector(`.builder-canvas [data-n="${CSS.escape(id)}"]`);
    cible?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deposer(cibleId: string, position: Position) {
    const source = glisse;
    setGlisse(null);
    setSurvol(null);
    if (!source) return;

    appliquer((a) => {
      if (position === "dedans") {
        if (!depotPermis(a, source, cibleId)) return a;
        return deplacer(a, source, cibleId);
      }
      const pere = parent(a, cibleId);
      if (!pere || !depotPermis(a, source, pere.id)) return a;
      const rang = (pere.enfants ?? []).findIndex((e) => e.id === cibleId);
      return deplacer(a, source, pere.id, position === "avant" ? rang : rang + 1);
    });
    selectionner(source);
  }

  function accepte(cibleId: string, position: Position): boolean {
    if (!glisse) return false;
    if (position === "dedans") return depotPermis(arbre, glisse, cibleId);
    const pere = parent(arbre, cibleId);
    return Boolean(pere && depotPermis(arbre, glisse, pere.id));
  }

  function renommer(id: string, nom: string) {
    const propre = nom.trim().slice(0, 80);
    appliquer((a) => modifierNoeud(a, id, { nom: propre || undefined }));
    setRenomme(null);
  }

  const vide = !arbre.enfants?.length;

  return (
    <div className="flex min-h-0 flex-col border-t border-outline-soft">
      <div className="flex items-center gap-1.5 px-2.5 pt-2.5">
        <Icon name="search" className="text-[15px] text-outline" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un bloc…"
          className="h-7 min-w-0 flex-1 rounded-md border border-outline-soft bg-surface-container-lowest px-2 text-label-md text-on-surface outline-none transition-colors focus:border-primary"
        />
        {recherche && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => setRecherche("")}
            className="text-outline hover:text-on-surface"
          >
            <Icon name="close" className="text-[15px]" />
          </button>
        )}
      </div>

      {vide ? (
        <p className="p-3 text-body-sm text-on-surface-variant">
          La page est vide. Ajoutez une section sous le canevas.
        </p>
      ) : filtres && filtres.size === 0 ? (
        <p className="p-3 text-label-md text-outline">Aucun bloc ne porte ce nom.</p>
      ) : (
        <ul className="p-2" onDragEnd={() => { setGlisse(null); setSurvol(null); }}>
          {arbre.enfants!.map((enfant, index) => (
            <Branche
              key={enfant.id}
              noeud={enfant}
              niveau={0}
              rang={index + 1}
              selection={selection}
              glisse={glisse}
              survol={survol}
              replies={replies}
              filtres={filtres}
              renomme={renomme}
              accepte={accepte}
              onAtteindre={atteindre}
              onBasculer={basculer}
              onGlisser={setGlisse}
              onSurvoler={setSurvol}
              onDeposer={deposer}
              onRenommer={renommer}
              onDemanderRenommage={setRenomme}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Le nom montré : celui qu'on a donné, sinon ce que le bloc dit de lui-même. */
function etiquetteDe(noeud: Noeud, rang: number): string {
  if (noeud.nom?.trim()) return noeud.nom.trim();
  const def = definition(noeud.type);
  if (noeud.type === "section") return rang ? `Section ${rang}` : "Section";
  if (noeud.type === "colonne") return rang ? `Colonne ${rang}` : "Colonne";
  const texte = noeud.props?.texte;
  if (typeof texte === "string" && texte.trim()) return texte.trim().slice(0, 28);
  const libelle = noeud.props?.libelle;
  if (typeof libelle === "string" && libelle.trim()) return libelle.trim().slice(0, 28);
  const titre = noeud.props?.titre;
  if (typeof titre === "string" && titre.trim()) return titre.trim().slice(0, 28);
  return def?.libelle ?? noeud.type;
}

interface ProprietesBranche {
  noeud: Noeud;
  niveau: number;
  rang: number;
  selection: string | null;
  glisse: string | null;
  survol: { id: string; position: Position } | null;
  replies: Set<string>;
  filtres: Set<string> | null;
  renomme: string | null;
  accepte: (cibleId: string, position: Position) => boolean;
  onAtteindre: (id: string) => void;
  onBasculer: (id: string) => void;
  onGlisser: (id: string | null) => void;
  onSurvoler: (v: { id: string; position: Position } | null) => void;
  onDeposer: (cibleId: string, position: Position) => void;
  onRenommer: (id: string, nom: string) => void;
  onDemanderRenommage: (id: string | null) => void;
}

function Branche(p: ProprietesBranche) {
  const { noeud, niveau, rang, selection, glisse, survol, replies, filtres, accepte } = p;

  if (filtres && !filtres.has(noeud.id)) return null;

  const def = definition(noeud.type);
  const conteneur = noeud.type === "section" || noeud.type === "colonne";
  const enCours = glisse === noeud.id;
  const aDesEnfants = Boolean(noeud.enfants?.length);
  // Une recherche déplie tout ce qu'elle montre : un résultat replié serait un
  // résultat invisible.
  const replie = !filtres && replies.has(noeud.id);

  function positionSous(e: React.DragEvent<HTMLDivElement>): Position {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    if (!conteneur) return y < 0.5 ? "avant" : "apres";
    if (y < 0.33) return "avant";
    if (y > 0.67) return "apres";
    return "dedans";
  }

  const marque = survol?.id === noeud.id ? survol.position : null;
  const enRenommage = p.renomme === noeud.id;

  return (
    <li>
      <div
        draggable={!enRenommage}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          p.onGlisser(noeud.id);
        }}
        onDragOver={(e) => {
          if (!glisse || enCours) return;
          const position = positionSous(e);
          if (!accepte(noeud.id, position)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (survol?.id !== noeud.id || survol.position !== position) {
            p.onSurvoler({ id: noeud.id, position });
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          p.onDeposer(noeud.id, positionSous(e));
        }}
        className={`group relative ${enCours ? "opacity-40" : ""}`}
      >
        {marque === "avant" && <Trait bord="top-0" />}

        <div
          style={{ paddingLeft: 4 + niveau * 12 }}
          className={`flex h-7 items-center gap-0.5 rounded-md pr-1 transition-colors ${
            selection === noeud.id
              ? "bg-primary/10 text-primary"
              : marque === "dedans"
                ? "bg-secondary/20 text-secondary"
                : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <button
            type="button"
            aria-label={replie ? "Déplier" : "Replier"}
            disabled={!aDesEnfants}
            onClick={() => p.onBasculer(noeud.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-outline disabled:opacity-0"
          >
            <Icon
              name={replie ? "chevron_right" : "expand_more"}
              className="text-[14px]"
            />
          </button>

          {enRenommage ? (
            <input
              autoFocus
              defaultValue={noeud.nom ?? etiquetteDe(noeud, rang)}
              onBlur={(e) => p.onRenommer(noeud.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") p.onRenommer(noeud.id, e.currentTarget.value);
                if (e.key === "Escape") p.onDemanderRenommage(null);
              }}
              className="h-5 min-w-0 flex-1 rounded border border-primary bg-surface-container-lowest px-1 text-body-sm text-on-surface outline-none"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => p.onAtteindre(noeud.id)}
                onDoubleClick={() => p.onDemanderRenommage(noeud.id)}
                title="Cliquer pour atteindre le bloc · double-clic pour le renommer"
                className="flex min-w-0 flex-1 cursor-grab items-center gap-1.5 text-left text-body-sm active:cursor-grabbing"
              >
                <Icon name={def?.icone ?? "widgets"} className="shrink-0 text-[15px]" />
                <span className="min-w-0 truncate">{etiquetteDe(noeud, rang)}</span>
              </button>
              <button
                type="button"
                aria-label={`Renommer ${etiquetteDe(noeud, rang)}`}
                onClick={() => p.onDemanderRenommage(noeud.id)}
                className="hidden shrink-0 text-outline hover:text-primary group-hover:block"
              >
                <Icon name="edit" className="text-[13px]" />
              </button>
            </>
          )}
        </div>

        {marque === "apres" && <Trait bord="bottom-0" />}
      </div>

      {aDesEnfants && !replie ? (
        <ul>
          {noeud.enfants!.map((enfant, index) => (
            <Branche key={enfant.id} {...p} noeud={enfant} niveau={niveau + 1} rang={index + 1} />
          ))}
        </ul>
      ) : conteneur && !aDesEnfants && glisse && accepte(noeud.id, "dedans") ? (
        // Une colonne vide n'a aucune ligne à survoler : sans cette bande, elle
        // serait la seule cible du builder qu'on ne peut pas atteindre.
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            p.onSurvoler({ id: noeud.id, position: "dedans" });
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            p.onDeposer(noeud.id, "dedans");
          }}
          style={{ marginLeft: 8 + (niveau + 1) * 12 }}
          className={`mb-1 rounded-md border border-dashed px-2 py-1 text-label-sm ${
            survol?.id === noeud.id
              ? "border-secondary text-secondary"
              : "border-outline-soft text-outline"
          }`}
        >
          Déposer ici
        </div>
      ) : null}
    </li>
  );
}

function Trait({ bord }: { bord: "top-0" | "bottom-0" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-1 ${bord} z-10 h-0.5 rounded bg-primary`}
    />
  );
}

export { trouver };
