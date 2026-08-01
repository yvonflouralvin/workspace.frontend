"use client";

import { useMemo, useRef, useState } from "react";
import { AttachFileOutlined, SendOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { poidsLisible } from "@repo/ui/ApercuFichier";

const CHAMP =
  "w-full resize-none rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export interface Personne {
  id: number;
  nom: string;
}

/** Le jeton en cours de frappe, s'il commence par « @ ».
 *
 *  On ne regarde QUE ce qui précède le curseur : sinon, revenir corriger un mot
 *  au milieu d'un message rouvrirait la liste sur une mention déjà posée. */
function jetonMention(valeur: string, curseur: number): { debut: number; requete: string } | null {
  const avant = valeur.slice(0, curseur);
  const trouve = avant.match(/(^|\s)@([\p{L}\p{N}._-]*)$/u);
  if (!trouve) return null;
  return { debut: curseur - trouve[2]!.length - 1, requete: trouve[2]! };
}

/** Zone de saisie d'un message : texte, mention d'un membre, pièce jointe.
 *
 *  Partagée par le composeur du haut et par celui d'une réponse — les deux
 *  écrivent exactement la même chose, il n'y a aucune raison qu'ils divergent.
 */
export function ZoneCommentaire({
  membres,
  placeholder,
  autoFocus,
  busy,
  libelleEnvoi = "Envoyer",
  onEnvoyer,
  onAnnuler,
}: {
  membres: Personne[];
  placeholder: string;
  autoFocus?: boolean;
  busy: boolean;
  libelleEnvoi?: string;
  onEnvoyer: (texte: string, fichier: File | null, mentions: number[]) => Promise<void>;
  onAnnuler?: () => void;
}) {
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  // Les personnes désignées PAR UN CLIC. On ne devine jamais une mention à
  // partir du texte seul : deux membres peuvent porter le même nom.
  const [designees, setDesignees] = useState<Personne[]>([]);
  const [jeton, setJeton] = useState<{ debut: number; requete: string } | null>(null);
  const [surligne, setSurligne] = useState(0);
  const zone = useRef<HTMLTextAreaElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const propositions = useMemo(() => {
    if (!jeton) return [];
    const q = jeton.requete.toLowerCase();
    return membres
      .filter((m) => m.nom.toLowerCase().includes(q))
      .filter((m) => !designees.some((d) => d.id === m.id))
      .slice(0, 6);
  }, [jeton, membres, designees]);

  function surFrappe(valeur: string, curseur: number) {
    setTexte(valeur);
    setJeton(jetonMention(valeur, curseur));
    setSurligne(0);
  }

  function choisir(personne: Personne) {
    if (!jeton) return;
    const avant = texte.slice(0, jeton.debut);
    const apres = texte.slice(jeton.debut + 1 + jeton.requete.length);
    const nouveau = `${avant}@${personne.nom} ${apres.replace(/^\s/, "")}`;
    setTexte(nouveau);
    setDesignees((d) => (d.some((p) => p.id === personne.id) ? d : [...d, personne]));
    setJeton(null);
    // Le curseur se replace juste après la mention : on continue d'écrire.
    const position = avant.length + personne.nom.length + 2;
    requestAnimationFrame(() => {
      zone.current?.focus();
      zone.current?.setSelectionRange(position, position);
    });
  }

  async function envoyer() {
    const corps = texte.trim();
    if (!corps && !fichier) return;
    // Une mention dont le nom a été effacé du texte n'en est plus une : on ne
    // notifie pas quelqu'un dont le nom n'apparaît nulle part.
    const retenues = designees.filter((p) => corps.includes(`@${p.nom}`)).map((p) => p.id);
    await onEnvoyer(corps, fichier, retenues);
    setTexte("");
    setFichier(null);
    setDesignees([]);
    setJeton(null);
    if (champFichier.current) champFichier.current.value = "";
  }

  return (
    <div>
      <div className="relative">
        <textarea
          ref={zone}
          rows={2}
          autoFocus={autoFocus}
          className={CHAMP}
          value={texte}
          onChange={(e) => surFrappe(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (propositions.length) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setSurligne((i) =>
                  e.key === "ArrowDown"
                    ? (i + 1) % propositions.length
                    : (i - 1 + propositions.length) % propositions.length
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                choisir(propositions[surligne]!);
                return;
              }
              if (e.key === "Escape") {
                setJeton(null);
                return;
              }
            }
            // Entrée envoie, Maj+Entrée passe à la ligne — usage d'un fil.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void envoyer();
            }
          }}
          placeholder={placeholder}
        />

        {propositions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Mentionner un membre"
            className="absolute z-20 mt-1 w-full max-w-[18rem] overflow-hidden rounded-xl border border-outline-soft bg-surface-container-lowest shadow-drawer"
          >
            {propositions.map((personne, index) => (
              <li key={personne.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === surligne}
                  onMouseDown={(e) => {
                    // `mousedown` et non `click` : le textarea perdrait le focus
                    // avant que le clic n'aboutisse, et le curseur sauterait.
                    e.preventDefault();
                    choisir(personne);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm transition-colors ${
                    index === surligne
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <Avatar name={personne.nom} size={20} />
                  {personne.nom}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {fichier && (
        <p className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 py-1 text-label-md text-on-surface-variant">
          <AttachFileOutlined style={{ fontSize: 14 }} />
          <span className="truncate">{fichier.name}</span>
          <span className="text-outline">{poidsLisible(fichier.size)}</span>
          <button
            type="button"
            aria-label="Retirer le fichier"
            onClick={() => {
              setFichier(null);
              if (champFichier.current) champFichier.current.value = "";
            }}
            className="text-outline hover:text-error transition-colors"
          >
            ×
          </button>
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          ref={champFichier}
          type="file"
          className="hidden"
          aria-label="Joindre un fichier"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => champFichier.current?.click()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <AttachFileOutlined style={{ fontSize: 15 }} />
          Joindre
        </button>
        <span className="flex-1" />
        {onAnnuler && (
          <button
            type="button"
            onClick={onAnnuler}
            className="h-8 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          disabled={busy || (!texte.trim() && !fichier)}
          onClick={envoyer}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          <SendOutlined style={{ fontSize: 15 }} />
          {libelleEnvoi}
        </button>
      </div>
    </div>
  );
}

/** Rend un message en surlignant les personnes nommées.
 *
 *  On ne surligne QUE les mentions enregistrées : chercher tous les `@mot` du
 *  texte ferait briller une adresse e-mail ou un pseudo qui ne désigne personne.
 */
export function CorpsCommentaire({
  texte,
  mentions,
}: {
  texte: string;
  mentions: { user_id: number; name: string }[];
}) {
  if (!mentions.length) {
    return (
      <p className="mt-0.5 whitespace-pre-wrap break-words text-body-sm text-on-surface">{texte}</p>
    );
  }
  const motif = new RegExp(
    `(@(?:${mentions.map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`,
    "g"
  );
  // Appartenance EXACTE plutôt qu'un `test()` : un motif porteur du drapeau `g`
  // garde sa position entre deux appels et déclarerait faux un morceau sur deux.
  const nommes = new Set(mentions.map((m) => `@${m.name}`));
  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-body-sm text-on-surface">
      {texte.split(motif).map((morceau, index) =>
        nommes.has(morceau) ? (
          <span key={index} className="rounded px-0.5 font-medium text-primary bg-primary/10">
            {morceau}
          </span>
        ) : (
          <span key={index}>{morceau}</span>
        )
      )}
    </p>
  );
}
