"use client";

/** Écrire à quelqu'un — un collègue ou un collaborateur virtuel.
 *
 *  L'ANNUAIRE MÊLE LES DEUX, et c'est voulu : au moment d'écrire, on cherche
 *  un nom, pas une catégorie. Les collaborateurs sont simplement groupés et
 *  marqués, pour qu'on sache à qui on s'adresse.
 */
import { useEffect, useMemo, useState } from "react";
import { PersonOutlineOutlined, SmartToyOutlined } from "@mui/icons-material";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { FormField } from "@repo/ui/FormField";

import { annuaire, creerFil } from "../api/client";
import type { FilDetail, Personne } from "../types";

export function NouveauMessage({
  peutSaisirUnCollaborateur,
  onClose,
  onCree,
}: {
  peutSaisirUnCollaborateur: boolean;
  onClose: () => void;
  onCree: (fil: FilDetail) => void;
}) {
  const [gens, setGens] = useState<Personne[]>([]);
  const [destinataire, setDestinataire] = useState<number | null>(null);
  const [sujet, setSujet] = useState("");
  const [contenu, setContenu] = useState("");
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    annuaire()
      .then(setGens)
      .catch(() => setGens([]));
  }, []);

  const { humains, agents } = useMemo(() => {
    const motif = filtre.trim().toLowerCase();
    const retenus = motif ? gens.filter((p) => p.nom.toLowerCase().includes(motif)) : gens;
    return {
      humains: retenus.filter((p) => !p.collaborateur),
      agents: retenus.filter((p) => p.collaborateur),
    };
  }, [gens, filtre]);

  const choisi = gens.find((p) => p.user_id === destinataire) ?? null;
  const agentSansDroit = choisi?.collaborateur === true && !peutSaisirUnCollaborateur;

  async function envoyer() {
    if (destinataire === null) throw new Error("Choisissez un destinataire.");
    if (!contenu.trim()) throw new Error("Écrivez un message.");
    if (agentSansDroit)
      throw new Error(
        "Confier du travail à un collaborateur demande le droit « confier du travail à un collaborateur virtuel ».",
      );
    onCree(await creerFil({ sujet, destinataires: [destinataire], contenu }));
  }

  return (
    <FormDrawer title="Nouveau message" submitLabel="Envoyer" onSubmit={envoyer} onClose={onClose}>
      <FormField label="À">
        <input
          type="text"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Chercher un nom…"
          className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
        />
        <div className="mt-2 max-h-[260px] overflow-y-auto rounded-lg border border-outline-soft">
          <Groupe
            titre="Membres"
            icone={<PersonOutlineOutlined style={{ fontSize: 15 }} />}
            gens={humains}
            choisi={destinataire}
            onChoisir={setDestinataire}
          />
          <Groupe
            titre="Collaborateurs"
            icone={<SmartToyOutlined style={{ fontSize: 15 }} />}
            gens={agents}
            choisi={destinataire}
            onChoisir={setDestinataire}
          />
          {humains.length === 0 && agents.length === 0 && (
            <p className="px-3 py-4 text-body-sm text-on-surface-variant">Personne à ce nom.</p>
          )}
        </div>
      </FormField>

      {agentSansDroit && (
        <p className="rounded-lg border border-outline-soft bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
          Un collaborateur travaille avec <strong>ses</strong> droits, pas les vôtres. Lui confier
          un travail demande le droit «&nbsp;confier du travail à un collaborateur
          virtuel&nbsp;» — à demander à un administrateur de cet espace.
        </p>
      )}

      <FormField label="Objet">
        <input
          type="text"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          placeholder="Facultatif — la première ligne fera l'affaire"
          maxLength={200}
          className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
        />
      </FormField>

      <FormField label="Message">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={7}
          placeholder={
            choisi?.collaborateur
              ? "Ce que vous attendez de lui. Soyez précis : il travaille seul et ne peut pas vous poser de question."
              : "Votre message…"
          }
          className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
        />
      </FormField>
    </FormDrawer>
  );
}

function Groupe({
  titre,
  icone,
  gens,
  choisi,
  onChoisir,
}: {
  titre: string;
  icone: React.ReactNode;
  gens: Personne[];
  choisi: number | null;
  onChoisir: (id: number) => void;
}) {
  if (gens.length === 0) return null;
  return (
    <div>
      <p className="sticky top-0 flex items-center gap-1.5 bg-surface-row-alt px-3 py-1.5 text-label-sm uppercase text-outline">
        {icone}
        {titre}
      </p>
      {gens.map((p) => (
        <button
          key={p.user_id}
          type="button"
          onClick={() => onChoisir(p.user_id)}
          className={`flex w-full items-center gap-2 border-t border-hairline px-3 py-2 text-left text-body-md transition-colors ${
            choisi === p.user_id
              ? "bg-primary/10 text-primary"
              : "text-on-surface hover:bg-surface-container-low"
          }`}
        >
          {p.nom}
        </button>
      ))}
    </div>
  );
}
