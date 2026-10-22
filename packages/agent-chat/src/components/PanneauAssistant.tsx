"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AutoAwesomeOutlined,
  CloseOutlined,
  HistoryOutlined,
  AddCommentOutlined,
  ArrowUpwardOutlined,
  StopCircleOutlined,
  DeleteOutlineOutlined,
  LockOutlined,
  AttachFileOutlined,
  DescriptionOutlined,
  DownloadOutlined,
  EditNoteOutlined,
} from "@mui/icons-material";
import { useShell } from "@repo/ui/shell/AppShell";
import { urlPiece } from "../api/client";
import { useAssistant } from "../hooks/useAssistant";
import { creerColleur } from "../lib/defilement";
import { Markdown } from "../lib/markdown";
import type { DemandeConfirmation, PieceJointe } from "../types";

export interface PanneauAssistantProps {
  /** Clé de l'app d'où l'on écrit — l'assistant s'en sert pour situer la question. */
  application: string;
  /** Prénom ou nom affiché dans l'accueil. Absent : accueil impersonnel. */
  membre?: string | null;
  /** Où l'administrateur branche l'abonnement Claude de l'organisation. */
  parametresUrl?: string;
  /** Le membre a-t-il le droit de joindre des fichiers (`agent.fichiers`) ?
   *  Sans lui, le trombone n'apparaît pas : un bouton qui rend 403 se clique
   *  vingt fois avant qu'on comprenne qu'il n'est pas pour nous. */
  fichiersAutorises?: boolean;
  base?: string;
  /** Par défaut, referme le panneau de la coquille qui l'héberge. */
  onClose?: () => void;
}

const SUGGESTIONS = [
  "Résume-moi ce que je dois faire aujourd'hui",
  "Explique-moi comment fonctionne cet écran",
  "Aide-moi à rédiger un message à un client",
];

export function PanneauAssistant({
  application,
  membre,
  parametresUrl,
  fichiersAutorises = false,
  base,
  onClose,
}: PanneauAssistantProps) {
  const shell = useShell();
  const fermer = onClose ?? (() => shell.setAssistantOuvert(false));
  const etat = useAssistant(application, base);
  const [brouillon, setBrouillon] = useState("");
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const filRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);
  const fichierRef = useRef<HTMLInputElement>(null);
  const colleur = useRef(creerColleur()).current;

  const vide = etat.messages.length === 0 && etat.enCours === null;

  useLayoutEffect(() => {
    if (filRef.current) colleur.suivre(filRef.current);
  }, [colleur, etat.messages, etat.enCours, etat.confirmation]);

  // Un fil qu'on ouvre s'ouvre sur son DERNIER message : c'est celui qu'on
  // vient relire. `chargement` compte autant que la conversation — au premier
  // rendu le fil ne porte qu'un squelette, et sa hauteur d'alors n'a rien à
  // voir avec celle du contenu.
  useLayoutEffect(() => {
    if (filRef.current) colleur.recoller(filRef.current);
  }, [colleur, etat.courante, etat.chargement]);

  useEffect(() => {
    saisieRef.current?.focus();
  }, []);

  // La saisie grandit avec le texte, jusqu'à six lignes — au-delà elle
  // mangerait le fil, qui est ce qu'on est venu lire.
  useLayoutEffect(() => {
    const zone = saisieRef.current;
    if (!zone) return;
    zone.style.height = "auto";
    zone.style.height = `${Math.min(zone.scrollHeight, 150)}px`;
  }, [brouillon]);

  async function soumettre() {
    const texte = brouillon;
    if (!texte.trim() || etat.enCours !== null) return;
    // On écrit : on veut voir la réponse arriver, où qu'on en soit de la relecture.
    if (filRef.current) colleur.recoller(filRef.current);
    setBrouillon("");
    await etat.envoyer(texte);
    saisieRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface-container-lowest">
      <header className="flex-shrink-0 flex items-center gap-2 h-[52px] md:h-14 px-3 border-b border-outline-variant">
        <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AutoAwesomeOutlined style={{ fontSize: 17 }} />
        </span>
        <span className="flex-1 min-w-0 truncate font-display text-[15px] font-semibold text-on-surface">
          Assistant
        </span>

        <div className="relative">
          <button
            onClick={() => setHistoriqueOuvert((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Conversations précédentes"
            aria-label="Conversations précédentes"
          >
            <HistoryOutlined style={{ fontSize: 18 }} />
          </button>
          {historiqueOuvert && (
            <Historique
              etat={etat}
              onClose={() => setHistoriqueOuvert(false)}
            />
          )}
        </div>

        <button
          onClick={() => {
            setHistoriqueOuvert(false);
            void etat.nouvelle();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Nouvelle conversation"
          aria-label="Nouvelle conversation"
        >
          <AddCommentOutlined style={{ fontSize: 18 }} />
        </button>
        <button
          onClick={fermer}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Fermer l'assistant"
          aria-label="Fermer l'assistant"
        >
          <CloseOutlined style={{ fontSize: 18 }} />
        </button>
      </header>

      <div
        ref={filRef}
        onScroll={() => filRef.current && colleur.defile(filRef.current)}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-4"
      >
        {etat.chargement ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-2/3 rounded-full bg-surface-container" />
            <div className="h-3 w-1/2 rounded-full bg-surface-container" />
          </div>
        ) : vide ? (
          <Accueil
            membre={membre}
            onChoisir={(texte) => {
              setBrouillon(texte);
              saisieRef.current?.focus();
            }}
          />
        ) : (
          <div className="space-y-4">
            {etat.messages.map((m) => (
              <Bulle
                key={m.id}
                role={m.role}
                contenu={m.contenu}
                erreur={m.erreur}
                pieces={m.pieces}
                conversationId={etat.courante}
                base={base}
              />
            ))}
            {etat.enCours !== null && (
              <Bulle
                role="AGENT"
                contenu={etat.enCours}
                erreur={null}
                conversationId={etat.courante}
                base={base}
                enCours
              />
            )}
          </div>
        )}

        {etat.confirmation && (
          <Confirmation demande={etat.confirmation} onTrancher={etat.trancher} />
        )}

        {etat.abonnementManquant && (
          <AbonnementAbsent parametresUrl={parametresUrl} />
        )}
      </div>

      <div className="flex-shrink-0 border-t border-outline-variant p-3">
        {etat.enAttente.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {etat.enAttente.map((attente) => (
              <span
                key={attente.cle}
                className="inline-flex items-center gap-1.5 max-w-full pl-2 pr-1 py-1 rounded-lg bg-surface-container text-body-sm text-on-surface"
              >
                <DescriptionOutlined style={{ fontSize: 14 }} className="flex-none text-on-surface-variant" />
                <span className="truncate max-w-[12rem]">{attente.fichier.name}</span>
                <span className="flex-none text-label-sm text-on-surface-variant">
                  {poidsLisible(attente.fichier.size)}
                </span>
                <button
                  onClick={() => etat.retirer(attente.cle)}
                  className="flex-none w-5 h-5 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                  aria-label={`Retirer « ${attente.fichier.name} »`}
                >
                  <CloseOutlined style={{ fontSize: 13 }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {etat.erreur && etat.enCours === null && !etat.abonnementManquant && (
          <p className="mb-2 px-1 text-body-sm text-error">{etat.erreur}</p>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-outline-soft bg-background px-3 py-2 focus-within:border-primary/40 transition-colors">
          {fichiersAutorises && (
            <>
              <input
                ref={fichierRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) etat.joindre(e.target.files);
                  // Remis à zéro : sans ça, rechoisir le MÊME fichier après
                  // l'avoir retiré ne déclenche aucun évènement.
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fichierRef.current?.click()}
                disabled={etat.enCours !== null}
                className="w-8 h-8 flex-none flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors"
                title="Joindre un fichier"
                aria-label="Joindre un fichier"
              >
                <AttachFileOutlined style={{ fontSize: 18 }} />
              </button>
            </>
          )}
          <textarea
            ref={saisieRef}
            rows={1}
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void soumettre();
              }
            }}
            placeholder="Posez votre question…"
            className="flex-1 resize-none bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant outline-none leading-relaxed max-h-[150px]"
          />
          {etat.enCours !== null ? (
            <button
              onClick={etat.interrompre}
              className="w-8 h-8 flex-none flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Arrêter"
              aria-label="Arrêter la réponse"
            >
              <StopCircleOutlined style={{ fontSize: 20 }} />
            </button>
          ) : (
            <button
              onClick={() => void soumettre()}
              disabled={!brouillon.trim()}
              className="w-8 h-8 flex-none flex items-center justify-center rounded-full bg-primary text-on-primary disabled:bg-track disabled:text-outline transition-colors"
              title="Envoyer"
              aria-label="Envoyer"
            >
              <ArrowUpwardOutlined style={{ fontSize: 18 }} />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-label-sm text-on-surface-variant">
          Entrée pour envoyer · Maj+Entrée pour aller à la ligne
        </p>
      </div>
    </div>
  );
}

function Accueil({
  membre,
  onChoisir,
}: {
  membre?: string | null;
  onChoisir: (texte: string) => void;
}) {
  const prenom = membre?.trim().split(/\s+/)[0];
  return (
    <div className="pt-6">
      <span className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <AutoAwesomeOutlined style={{ fontSize: 22 }} />
      </span>
      <p className="mt-3 font-display text-headline-sm text-on-surface">
        {prenom ? `Bonjour ${prenom}` : "Bonjour"}
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Posez votre question, je connais l'espace de travail où vous êtes.
      </p>
      <div className="mt-5 space-y-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChoisir(s)}
            className="w-full text-left px-3 py-2.5 rounded-xl border border-outline-soft bg-background text-body-sm text-on-surface hover:border-primary/40 hover:bg-surface-container-low transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function Pieces({
  pieces,
  conversationId,
  base,
  sombre = false,
}: {
  pieces: PieceJointe[];
  conversationId: number | null;
  base?: string;
  sombre?: boolean;
}) {
  if (pieces.length === 0 || conversationId === null) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${sombre ? "mt-2" : "mt-2"}`}>
      {pieces.map((piece) => (
        <a
          key={piece.document_id}
          href={urlPiece(conversationId, piece.document_id, base)}
          download={piece.nom}
          className={
            sombre
              ? "inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-lg bg-white/15 text-on-primary text-body-sm hover:bg-white/25 transition-colors"
              : "inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-lg border border-outline-soft bg-surface-container-lowest text-on-surface text-body-sm hover:border-primary/40 transition-colors"
          }
        >
          <DescriptionOutlined style={{ fontSize: 14 }} className="flex-none" />
          <span className="truncate max-w-[12rem]">{piece.nom}</span>
          <span className={`flex-none text-label-sm ${sombre ? "opacity-70" : "text-on-surface-variant"}`}>
            {poidsLisible(piece.taille)}
          </span>
          <DownloadOutlined style={{ fontSize: 13 }} className="flex-none opacity-60" />
        </a>
      ))}
    </div>
  );
}

function Bulle({
  role,
  contenu,
  erreur,
  pieces,
  conversationId,
  base,
  enCours = false,
}: {
  role: string;
  contenu: string;
  erreur: string | null;
  pieces?: PieceJointe[];
  conversationId?: number | null;
  base?: string;
  enCours?: boolean;
}) {
  if (role === "MEMBRE") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-on-primary px-3.5 py-2 text-body-sm whitespace-pre-wrap break-words">
          {contenu}
          <Pieces
            pieces={pieces ?? []}
            conversationId={conversationId ?? null}
            base={base}
            sombre
          />
        </div>
      </div>
    );
  }

  return (
    <div className="text-body-sm text-on-surface-variant break-words">
      {contenu && <Markdown texte={contenu} />}
      <Pieces pieces={pieces ?? []} conversationId={conversationId ?? null} base={base} />
      {enCours && (
        <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-primary animate-pulse rounded-sm" />
      )}
      {erreur && (
        <p className="mt-2 px-3 py-2 rounded-xl bg-error-container/40 text-error text-body-sm">
          {erreur}
        </p>
      )}
    </div>
  );
}

function AbonnementAbsent({ parametresUrl }: { parametresUrl?: string }) {
  return (
    <div className="mt-4 p-3 rounded-2xl border border-outline-soft bg-surface-container-low">
      <p className="flex items-center gap-2 text-body-sm font-semibold text-on-surface">
        <LockOutlined style={{ fontSize: 16 }} className="text-on-surface-variant" />
        Aucun abonnement Claude connecté
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        L'assistant s'appuie sur l'abonnement Claude de votre organisation. Un
        administrateur doit le brancher avant la première question.
      </p>
      {parametresUrl && (
        <a
          href={parametresUrl}
          className="inline-block mt-2 text-body-sm text-primary underline underline-offset-2"
        >
          Ouvrir les paramètres de l'assistant
        </a>
      )}
    </div>
  );
}

function Historique({
  etat,
  onClose,
}: {
  etat: ReturnType<typeof useAssistant>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-50 w-72 max-h-80 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg py-1.5"
    >
      {etat.conversations.length === 0 ? (
        <p className="px-3 py-4 text-body-sm text-on-surface-variant text-center">
          Aucune conversation pour l'instant.
        </p>
      ) : (
        etat.conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 px-1.5 ${c.id === etat.courante ? "bg-surface-container-low" : ""}`}
          >
            <button
              onClick={() => {
                void etat.choisir(c.id);
                onClose();
              }}
              className="flex-1 min-w-0 text-left px-2 py-2 rounded-lg text-body-sm text-on-surface hover:bg-surface-container transition-colors truncate"
            >
              {c.titre || "Sans titre"}
            </button>
            <button
              onClick={() => void etat.archiver(c.id)}
              className="w-7 h-7 flex-none flex items-center justify-center rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-container transition-all"
              title="Archiver"
              aria-label={`Archiver « ${c.titre || "Sans titre"} »`}
            >
              <DeleteOutlineOutlined style={{ fontSize: 16 }} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}


/** La carte qui demande l'autorisation d'une écriture.
 *
 *  LE TOUR EST SUSPENDU tant qu'elle attend : côté serveur, l'appel de l'outil
 *  est bloqué. D'où deux partis pris. Les ARGUMENTS SONT MONTRÉS, tous, tels
 *  qu'ils partiront — c'est sur eux qu'on s'engage, pas sur le nom de l'outil.
 *  Et « Refuser » est le bouton neutre, « Autoriser » le bouton marqué : on ne
 *  clique pas une écriture par réflexe.
 */
export function Confirmation({
  demande,
  onTrancher,
}: {
  demande: DemandeConfirmation;
  onTrancher: (autorise: boolean) => Promise<void>;
}) {
  const [envoi, setEnvoi] = useState(false);

  async function trancher(autorise: boolean) {
    setEnvoi(true);
    await onTrancher(autorise);
  }

  const lignes = Object.entries(demande.arguments ?? {});

  return (
    <div className="mt-4 p-3 rounded-2xl border border-primary/30 bg-primary/5">
      <p className="flex items-center gap-2 text-body-sm font-semibold text-on-surface">
        <EditNoteOutlined style={{ fontSize: 17 }} className="text-primary" />
        L&apos;assistant veut écrire
      </p>
      <p className="mt-1 text-body-sm text-on-surface">{demande.libelle}</p>

      {lignes.length > 0 && (
        <dl className="mt-2 space-y-0.5 rounded-xl bg-surface-container-lowest border border-outline-soft px-2.5 py-2">
          {lignes.map(([cle, valeur]) => (
            <div key={cle} className="flex gap-2 text-body-sm">
              <dt className="flex-none text-on-surface-variant">{cle}</dt>
              <dd className="flex-1 min-w-0 break-words text-on-surface font-medium">
                {typeof valeur === "object" && valeur !== null
                  ? JSON.stringify(valeur)
                  : String(valeur)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-2 text-label-sm text-on-surface-variant">
        Sans réponse, l&apos;action ne se fera pas.
      </p>

      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => void trancher(true)}
          disabled={envoi}
          className="h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-medium disabled:bg-track disabled:text-outline transition-colors"
        >
          Autoriser
        </button>
        <button
          onClick={() => void trancher(false)}
          disabled={envoi}
          className="h-8 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors"
        >
          Refuser
        </button>
      </div>
    </div>
  );
}
