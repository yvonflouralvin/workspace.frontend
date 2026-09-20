"use client";

import { useState } from "react";
import {
  ContentCopyOutlined,
  KeyOutlined,
  LoginOutlined,
  PersonOffOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Modal } from "@repo/ui/Modal";
import {
  donnerAcces,
  reinitialiserMotDePasse,
  retirerAcces,
  type AccesClient,
} from "@/lib/acces-client-api";
import type { Contact } from "@/lib/tiers-api";

const CONNEXION = process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "";

interface Identifiants {
  email: string;
  motDePasse: string | null;
  compteExistant: boolean;
}

/** Ce qu'il faut transmettre à la personne — et la seule fois où le mot de passe se voit. */
function FenetreIdentifiants({ identifiants, onClose }: { identifiants: Identifiants; onClose: () => void }) {
  const [copie, setCopie] = useState(false);
  return (
    <Modal
      title="Accès au portail"
      onClose={onClose}
      footer={
        <div className="flex justify-end w-full">
          <button onClick={onClose} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">
            J&apos;ai noté le mot de passe
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {identifiants.motDePasse ? (
          <p className="text-body-sm text-on-surface-variant">
            Transmettez ces informations à la personne par un canal sûr (téléphone, message direct).
            <strong className="text-on-surface"> Le mot de passe ne sera plus affiché.</strong> Aucun e-mail n&apos;est envoyé.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            Cette personne avait déjà un compte sur la plateforme : elle se connecte avec son mot de passe habituel.
          </p>
        )}
        <dl className="rounded-xl border border-outline-soft divide-y divide-hairline text-body-sm">
          {CONNEXION && (
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-on-surface-variant">Adresse</dt>
              <dd className="font-mono text-on-surface truncate">{CONNEXION.replace(/^https?:\/\//, "")}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-on-surface-variant">Identifiant</dt>
            <dd className="font-mono text-on-surface truncate">{identifiants.email}</dd>
          </div>
          {identifiants.motDePasse && (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-on-surface-variant">Mot de passe</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-body-md font-semibold text-on-surface select-all">
                  {identifiants.motDePasse}
                </span>
                <button
                  type="button"
                  aria-label="Copier le mot de passe"
                  onClick={() => {
                    void navigator.clipboard?.writeText(identifiants.motDePasse ?? "");
                    setCopie(true);
                  }}
                  className="text-outline hover:text-primary transition-colors"
                >
                  <ContentCopyOutlined style={{ fontSize: 16 }} />
                </button>
                {copie && <span className="text-label-md text-secondary">Copié</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}

/** Le droit, pour un contact, de se connecter au portail — l'état, et les gestes.
 *
 *  Rendu à droite de chaque contact de la fiche client. Sans e-mail il n'y a rien à ouvrir : la
 *  personne se connecte avec son adresse. */
export function AccesPortailContact({
  contact,
  tiersId,
  tiersNom,
  acces,
  onChange,
}: {
  contact: Contact;
  tiersId: number;
  tiersNom: string;
  acces: AccesClient | undefined;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [identifiants, setIdentifiants] = useState<Identifiants | null>(null);
  const [confirmerRetrait, setConfirmerRetrait] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErreur(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  const bouton =
    "inline-flex items-center gap-1 h-7 px-2 rounded-lg text-label-md font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {acces ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-label-sm font-semibold text-secondary">
              <LoginOutlined style={{ fontSize: 12 }} />
              Accès au portail
            </span>
            <button
              type="button"
              disabled={busy}
              title="Générer un nouveau mot de passe"
              onClick={() =>
                run(async () => {
                  const mdp = await reinitialiserMotDePasse(acces.id);
                  setIdentifiants({ email: acces.email, motDePasse: mdp, compteExistant: false });
                })
              }
              className={`${bouton} text-on-surface-variant hover:bg-surface-container-low hover:text-primary`}
            >
              <KeyOutlined style={{ fontSize: 14 }} />
              Nouveau mot de passe
            </button>
            <button
              type="button"
              disabled={busy}
              title="Retirer l'accès"
              onClick={() => setConfirmerRetrait(true)}
              className={`${bouton} text-on-surface-variant hover:bg-error-container hover:text-error`}
            >
              <PersonOffOutlined style={{ fontSize: 14 }} />
              Retirer
            </button>
          </>
        ) : contact.email ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await donnerAcces({
                  tiers_id: tiersId,
                  tiers_nom: tiersNom,
                  contact_id: contact.id,
                  email: contact.email ?? "",
                  nom: contact.nom,
                });
                setIdentifiants({
                  email: r.acces.email,
                  motDePasse: r.mot_de_passe_initial,
                  compteExistant: r.compte_existant,
                });
              })
            }
            className={`${bouton} border border-outline-soft text-on-surface-variant hover:bg-surface-container-low hover:text-primary`}
          >
            <LoginOutlined style={{ fontSize: 14 }} />
            Donner l&apos;accès au portail
          </button>
        ) : (
          <span className="text-label-md text-outline">Ajoutez un e-mail pour ouvrir l&apos;accès</span>
        )}
      </div>
      {erreur && <p className="max-w-[320px] text-right text-label-md text-error">{erreur}</p>}

      {identifiants && <FenetreIdentifiants identifiants={identifiants} onClose={() => setIdentifiants(null)} />}
      {confirmerRetrait && acces && (
        <ConfirmDialog
          title={`Retirer l'accès de ${contact.nom} ?`}
          message="Cette personne ne pourra plus se connecter au portail. Ses commentaires et ses documents restent sur les tâches."
          confirmLabel="Retirer l'accès"
          busy={busy}
          onConfirm={() => {
            setConfirmerRetrait(false);
            void run(() => retirerAcces(acces.id));
          }}
          onCancel={() => setConfirmerRetrait(false)}
        />
      )}
    </div>
  );
}
