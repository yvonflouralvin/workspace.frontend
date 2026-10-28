"use client";

/** LA BOÎTE DE RÉCEPTION : un seul endroit pour tout ce qui m'est adressé.
 *
 *  Trois rayons, et chacun répond à une question différente :
 *
 *    - MEMBRES — ce qu'un collègue m'écrit.
 *    - COLLABORATEURS — ce que je confie à un agent, et ce qu'il me rend.
 *      C'est ici qu'on lui donne du travail, plus dans un écran de réglages :
 *      confier un dossier n'est pas configurer un compte.
 *    - NOTIFICATIONS — tout ce que les applications signalent. Elles étaient
 *      déjà gardées pour toujours, mais seule la cloche les montrait : passé
 *      quelques jours, une alerte existait et restait introuvable.
 *
 *  « TOUT » les mêle par date, parce que la question de tous les matins n'est
 *  pas « qu'est-ce qu'on m'a écrit » mais « qu'est-ce qui m'attend ».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DoneAllOutlined,
  EditOutlined,
  InboxOutlined,
  SmartToyOutlined,
  PersonOutlineOutlined,
  NotificationsNoneOutlined,
} from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "@repo/notifications/api/client";
import type { InAppNotification } from "@repo/notifications/types/notification";

import { listerFils, resume as lireResume } from "../api/client";
import { cleDe, depuis, estNonLue, melanger, titreDe } from "../lib/entrees";
import type { Entree } from "../lib/entrees";
import type { Fil, Resume } from "../types";
import { NouveauMessage } from "./NouveauMessage";
import { VueFil } from "./VueFil";
import { VueNotification } from "./VueNotification";

/** Un collaborateur met des dizaines de secondes à répondre. Tant qu'un fil
 *  attend, on redemande — sinon la réponse n'arrive qu'au prochain clic. */
const RYTHME_MS = 4000;

type Rayon = "tout" | "membres" | "collaborateurs" | "notifications";

const RAYONS: { cle: Rayon; libelle: string; icone: React.ReactNode }[] = [
  { cle: "tout", libelle: "Tout", icone: <InboxOutlined style={{ fontSize: 16 }} /> },
  { cle: "membres", libelle: "Membres", icone: <PersonOutlineOutlined style={{ fontSize: 16 }} /> },
  {
    cle: "collaborateurs",
    libelle: "Collaborateurs",
    icone: <SmartToyOutlined style={{ fontSize: 16 }} />,
  },
  {
    cle: "notifications",
    libelle: "Notifications",
    icone: <NotificationsNoneOutlined style={{ fontSize: 16 }} />,
  },
];

export function BoiteDeReception({
  peutSaisirUnCollaborateur = false,
  filInitial,
}: {
  /** `agent.collaborateurs.saisir`. Sans lui, écrire à un agent est refusé
   *  côté serveur — autant ne pas le proposer. */
  peutSaisirUnCollaborateur?: boolean;
  /** Ouvre directement un fil : c'est par là qu'arrive le lien d'une
   *  notification de message. */
  filInitial?: number;
}) {
  const [rayon, setRayon] = useState<Rayon>("tout");
  const [recherche, setRecherche] = useState("");
  const [fils, setFils] = useState<Fil[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [compte, setCompte] = useState<Resume | null>(null);
  const [chargement, setChargement] = useState(true);
  const [choisi, setChoisi] = useState<Entree | null>(null);
  const [composer, setComposer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const genre = rayon === "membres" ? "MEMBRE" : rayon === "collaborateurs" ? "COLLABORATEUR" : "";
  const sansFils = rayon === "notifications";
  const sansNotifications = rayon === "membres" || rayon === "collaborateurs";

  const recharger = useCallback(
    async (silencieux = false) => {
      if (!silencieux) setChargement(true);
      try {
        const [listeFils, listeNotifs, r] = await Promise.all([
          sansFils
            ? Promise.resolve({ items: [], total: 0 })
            : listerFils({ genre: genre || undefined, q: recherche || undefined }),
          sansNotifications
            ? Promise.resolve({ items: [], unread_count: 0 })
            : listNotifications("/api/notifications", { q: recherche || undefined, limit: 50 }),
          lireResume(),
        ]);
        setFils(listeFils.items);
        setNotifications(listeNotifs.items);
        setCompte(r);
        setErreur(null);
      } catch {
        setErreur("La boîte n'a pas pu être chargée.");
      } finally {
        setChargement(false);
      }
    },
    [genre, recherche, sansFils, sansNotifications],
  );

  useEffect(() => {
    void recharger();
  }, [recharger]);

  // Ouvrir le fil désigné par l'URL, une seule fois : au-delà, l'utilisateur
  // navigue et reprendre la main sur sa sélection serait pénible.
  const ouvertureFaite = useRef(false);
  useEffect(() => {
    if (ouvertureFaite.current || !filInitial || fils.length === 0) return;
    const cible = fils.find((f) => f.id === filInitial);
    if (cible) {
      ouvertureFaite.current = true;
      setChoisi({ sorte: "fil", date: cible.dernier_message_le, fil: cible });
    }
  }, [filInitial, fils]);

  // Un seul fil qui attend suffit à justifier le rafraîchissement : c'est
  // exactement le moment où l'on regarde l'écran.
  const enAttente = fils.some((f) => f.en_cours);
  useEffect(() => {
    if (!enAttente) return;
    const minuteur = setInterval(() => void recharger(true), RYTHME_MS);
    return () => clearInterval(minuteur);
  }, [enAttente, recharger]);

  const entrees = useMemo(() => melanger(fils, notifications), [fils, notifications]);

  async function ouvrir(entree: Entree) {
    setChoisi(entree);
    if (entree.sorte === "notification" && !entree.notification.read_at) {
      await markRead(entree.notification.id).catch(() => {});
      void recharger(true);
    }
    if (entree.sorte === "fil" && entree.fil.non_lu) {
      // Le marquage se fait à l'ouverture côté serveur (GET du fil) ; on
      // rafraîchit juste les pastilles.
      setTimeout(() => void recharger(true), 300);
    }
  }

  async function toutMarquerLu() {
    await markAllRead().catch(() => {});
    void recharger(true);
  }

  const pastille = (cle: Rayon) => {
    if (!compte) return 0;
    if (cle === "tout") return compte.total;
    if (cle === "membres") return compte.membres;
    if (cle === "collaborateurs") return compte.collaborateurs;
    return compte.notifications;
  };

  return (
    <div className="h-full flex">
      <aside className="w-full md:w-[380px] shrink-0 flex flex-col border-r border-outline-variant bg-surface-container-lowest">
        <div className="shrink-0 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-headline-sm text-on-surface">Boîte de réception</h1>
            <button
              type="button"
              onClick={() => setComposer(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary shadow-button hover:bg-primary-container transition-colors"
            >
              <EditOutlined style={{ fontSize: 16 }} />
              Nouveau
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1 overflow-x-auto">
            {RAYONS.map((r) => {
              const actif = r.cle === rayon;
              const n = pastille(r.cle);
              return (
                <button
                  key={r.cle}
                  type="button"
                  onClick={() => {
                    setRayon(r.cle);
                    setChoisi(null);
                  }}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-label-md transition-colors ${
                    actif
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {r.icone}
                  {r.libelle}
                  {n > 0 && (
                    <span className="ml-0.5 inline-flex min-w-[18px] justify-center rounded-full bg-primary px-1 text-label-sm text-on-primary">
                      {n > 99 ? "99+" : n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <SearchField
              value={recherche}
              onChange={setRecherche}
              placeholder="Chercher un message, une alerte…"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border-t border-hairline">
          {chargement ? (
            <p className="px-4 py-6 text-body-sm text-on-surface-variant">Chargement…</p>
          ) : erreur ? (
            <p className="px-4 py-6 text-body-sm text-error">{erreur}</p>
          ) : entrees.length === 0 ? (
            <Vide rayon={rayon} recherche={recherche} />
          ) : (
            <ul>
              {entrees.map((e) => (
                <LigneEntree
                  key={cleDe(e)}
                  entree={e}
                  actif={estLeMeme(e, choisi)}
                  onClick={() => void ouvrir(e)}
                />
              ))}
            </ul>
          )}
        </div>

        {compte !== null && compte.notifications > 0 && rayon !== "membres" && (
          <button
            type="button"
            onClick={() => void toutMarquerLu()}
            className="shrink-0 flex items-center justify-center gap-1.5 border-t border-hairline px-4 py-2.5 text-label-md text-primary hover:bg-surface-container-low transition-colors"
          >
            <DoneAllOutlined style={{ fontSize: 16 }} />
            Marquer les notifications comme lues
          </button>
        )}
      </aside>

      <section className="hidden md:flex flex-1 min-w-0 flex-col bg-background">
        {choisi === null ? (
          <RienDeChoisi />
        ) : choisi.sorte === "fil" ? (
          <VueFil
            filId={choisi.fil.id}
            onChange={() => void recharger(true)}
            peutEcrire={choisi.fil.genre !== "COLLABORATEUR" || peutSaisirUnCollaborateur}
          />
        ) : (
          <VueNotification notification={choisi.notification} />
        )}
      </section>

      {composer && (
        <NouveauMessage
          peutSaisirUnCollaborateur={peutSaisirUnCollaborateur}
          onClose={() => setComposer(false)}
          onCree={(fil) => {
            setComposer(false);
            setChoisi({ sorte: "fil", date: fil.dernier_message_le, fil });
            void recharger(true);
          }}
        />
      )}
    </div>
  );
}

function estLeMeme(a: Entree, b: Entree | null): boolean {
  if (b === null || a.sorte !== b.sorte) return false;
  return a.sorte === "fil" && b.sorte === "fil"
    ? a.fil.id === b.fil.id
    : a.sorte === "notification" && b.sorte === "notification"
      ? a.notification.id === b.notification.id
      : false;
}

function LigneEntree({
  entree,
  actif,
  onClick,
}: {
  entree: Entree;
  actif: boolean;
  onClick: () => void;
}) {
  const nonLu = estNonLue(entree);
  const titre = titreDe(entree);
  const corps =
    entree.sorte === "fil" ? entree.fil.apercu : (entree.notification.body ?? "");

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3 border-b border-hairline transition-colors ${
          actif ? "bg-primary/5" : "hover:bg-surface-container-low"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-on-surface-variant">
            <IconeEntree entree={entree} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`truncate text-body-md ${
                  nonLu ? "font-semibold text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {titre}
              </span>
              <span className="shrink-0 text-label-sm text-outline">{depuis(entree.date)}</span>
            </div>
            <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
              {entree.sorte === "fil" && entree.fil.en_cours ? (
                <span className="text-primary">réfléchit…</span>
              ) : (
                corps || "—"
              )}
            </p>
          </div>
          {nonLu && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
      </button>
    </li>
  );
}

function IconeEntree({ entree }: { entree: Entree }) {
  if (entree.sorte === "notification")
    return <NotificationsNoneOutlined style={{ fontSize: 18 }} />;
  return entree.fil.genre === "COLLABORATEUR" ? (
    <SmartToyOutlined style={{ fontSize: 18 }} />
  ) : (
    <PersonOutlineOutlined style={{ fontSize: 18 }} />
  );
}

function Vide({ rayon, recherche }: { rayon: Rayon; recherche: string }) {
  if (recherche)
    return (
      <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
        Rien ne correspond à «&nbsp;{recherche}&nbsp;».
      </p>
    );
  const phrases: Record<Rayon, string> = {
    tout: "Rien ne vous attend.",
    membres: "Aucun message d'un collègue.",
    collaborateurs:
      "Aucun échange avec un collaborateur. « Nouveau » pour lui confier un premier travail.",
    notifications: "Aucune alerte des applications.",
  };
  return (
    <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">{phrases[rayon]}</p>
  );
}

function RienDeChoisi() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-variant">
      <InboxOutlined style={{ fontSize: 32 }} />
      <p className="text-body-sm">Choisissez un élément pour le lire.</p>
    </div>
  );
}
