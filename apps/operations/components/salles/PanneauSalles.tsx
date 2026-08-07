"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { InsightsOutlined, MeetingRoomOutlined } from "@mui/icons-material";
import { BarreProportion, Kpi } from "@/components/Mesures";
import { operationsApi, type OccupationSalles } from "@/lib/operations-api";

/** Les fenêtres proposées. Comme pour une ressource, on ne descend pas sous la
 *  semaine : un taux d'occupation calculé sur un jour dirait surtout quel jour
 *  on a choisi. */
const FENETRES = [
  { libelle: "7 jours", jours: 7 },
  { libelle: "4 semaines", jours: 28 },
  { libelle: "3 mois", jours: 90 },
] as const;

/** L'inventaire des salles avec ce qu'elles pèsent — le pendant, pour les
 *  salles, de la liste des ressources et du rapport d'un planning. */
export function PanneauSalles() {
  const [jours, setJours] = useState<number>(28);
  const [donnees, setDonnees] = useState<OccupationSalles | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setDonnees(null);
    try {
      const fin = new Date();
      fin.setHours(0, 0, 0, 0);
      fin.setDate(fin.getDate() + 1);
      const debut = new Date(fin.getTime() - jours * 86_400_000);
      setDonnees(
        await operationsApi.occupationSalles({
          depuis: debut.toISOString(),
          jusqu_a: fin.toISOString(),
        }),
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Occupation indisponible.");
    }
  }, [jours]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Salles</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Les espaces réservables et ce qu&apos;ils pèsent. Les salles se créent depuis
            Plannings › Ressources, comme espaces.
          </p>
        </div>
        <div className="flex rounded-lg border border-outline-soft p-0.5">
          {FENETRES.map((f) => (
            <button
              key={f.jours}
              type="button"
              onClick={() => setJours(f.jours)}
              className={`h-8 rounded-md px-3 text-body-sm transition-colors ${
                jours === f.jours
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {f.libelle}
            </button>
          ))}
        </div>
      </div>

      {erreur && (
        <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {!donnees ? (
        !erreur && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      ) : donnees.salles.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
          <MeetingRoomOutlined style={{ fontSize: 28 }} className="text-outline" />
          <p className="mt-2 text-body-md text-on-surface">Aucune salle.</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Une salle est une ressource de type Espace — créez-la depuis Plannings ›
            Ressources.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi libelle="Salles" valeur={donnees.totaux.salles} />
            <Kpi
              libelle="Occupées sur la période"
              valeur={donnees.totaux.occupees}
              note={`sur ${donnees.totaux.salles}`}
            />
            <Kpi libelle="Heures réservées" valeur={donnees.totaux.heures} unite="h" />
            <Kpi
              libelle="Demandes en attente"
              valeur={donnees.totaux.en_attente}
              alerte={donnees.totaux.en_attente > 0}
              note="Personne n'a encore tranché"
            />
          </div>

          {/* Le dénominateur est écrit : un taux d'occupation dont on ignore la
              base se lit comme on veut. */}
          <p className="mt-2 text-label-md text-outline">
            Taux rapportés à {donnees.fenetre.heures_ouvrables} h ouvrables par salle —{" "}
            {donnees.fenetre.plage}, soit {donnees.fenetre.jours_ouvres} jours sur la période.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-soft bg-surface-row-alt">
                  <Th>Salle</Th>
                  <Th align="right">Capacité</Th>
                  <Th align="right">Réservations</Th>
                  <Th align="right">Heures</Th>
                  <Th>Occupation</Th>
                  <Th align="right">En attente</Th>
                  <Th align="right">Détail</Th>
                </tr>
              </thead>
              <tbody>
                {donnees.salles.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-hairline last:border-b-0 hover:bg-surface-container-low ${
                      s.active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/ressources/${s.id}`}
                        className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-on-surface hover:underline"
                      >
                        {s.nom}
                        {!s.active && (
                          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-normal text-on-surface-variant">
                            Hors service
                          </span>
                        )}
                      </Link>
                      {s.categorie && (
                        <p className="text-label-sm text-outline">{s.categorie}</p>
                      )}
                    </td>
                    <Td>{s.capacite ?? "—"}</Td>
                    <Td>{s.reservations}</Td>
                    <Td>{s.heures}</Td>
                    <td className="w-[26%] px-4 py-2.5">
                      <BarreProportion pourcentage={s.taux} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums">
                      {s.en_attente > 0 ? (
                        <span className="text-error">{s.en_attente}</span>
                      ) : (
                        <span className="text-on-surface-variant">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/ressources/${s.id}`}
                        className="inline-flex items-center gap-1 text-label-md text-primary hover:underline"
                      >
                        <InsightsOutlined style={{ fontSize: 15 }} />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-2 text-label-sm uppercase tracking-wide text-outline ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
      {children}
    </td>
  );
}
