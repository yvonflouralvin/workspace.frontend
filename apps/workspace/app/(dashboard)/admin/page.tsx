"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AddOutlined,
  ContentCopyOutlined,
  GroupOutlined,
  InsightsOutlined,
  StorefrontOutlined,
  WorkspacesOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  MODE_LABELS,
  VISIBILITE_LABELS,
  appsApi,
  type Abonnement,
  type Apercu,
  type AppPlateforme,
  type CodeActivation,
  type WorkspacePlateforme,
} from "@/app/lib/apps-api";

type Onglet = "apercu" | "workspaces" | "apps" | "codes" | "abonnements";

const CHAMP =
  "h-8 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/** SAAS Monitoring — le pilotage de la plateforme.
 *
 *  Servie par l'application `workspace` plutôt que par une application Next
 *  dédiée : un conteneur, un build et un domaine de plus pour un écran
 *  d'administration que trois personnes ouvriront. Elle reste enregistrée comme
 *  application CACHÉE dans le catalogue — elle a son identifiant, elle
 *  s'active, et son accès est gardé par `platform.manage`.
 */
export default function AdminPage() {
  const { can } = usePermissions();
  const [onglet, setOnglet] = useState<Onglet>("apercu");
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspacePlateforme[]>([]);
  const [apps, setApps] = useState<AppPlateforme[]>([]);
  const [codes, setCodes] = useState<CodeActivation[]>([]);
  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const autorise = can("platform.manage");

  const charger = useCallback(async () => {
    if (!autorise) return;
    try {
      const [a, w, ap, c, ab] = await Promise.all([
        appsApi.apercu(),
        appsApi.workspaces(),
        appsApi.appsPlateforme(),
        appsApi.codes(),
        appsApi.abonnements(),
      ]);
      setApercu(a);
      setWorkspaces(w);
      setApps(ap);
      setCodes(c);
      setAbonnements(ab);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [autorise]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (!autorise) {
    // 403 assumé et non page blanche : la personne est connectée, elle a le
    // droit de savoir que cette porte existe et qu'elle ne lui est pas ouverte.
    return (
      <div className="p-8 max-w-[640px] mx-auto">
        <h1 className="font-display text-headline-sm text-on-surface">SAAS Monitoring</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Cet écran est réservé au pilotage de la plateforme. Votre compte ne porte pas la
          permission <code className="font-mono text-body-sm">platform.manage</code>.
        </p>
      </div>
    );
  }

  const onglets: { cle: Onglet; libelle: string; icone: React.ReactNode }[] = [
    { cle: "apercu", libelle: "Aperçu", icone: <InsightsOutlined style={{ fontSize: 17 }} /> },
    { cle: "workspaces", libelle: "Workspaces", icone: <WorkspacesOutlined style={{ fontSize: 17 }} /> },
    { cle: "apps", libelle: "Applications", icone: <StorefrontOutlined style={{ fontSize: 17 }} /> },
    { cle: "codes", libelle: "Codes", icone: <AddOutlined style={{ fontSize: 17 }} /> },
    { cle: "abonnements", libelle: "Abonnements", icone: <GroupOutlined style={{ fontSize: 17 }} /> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      <h1 className="font-display text-headline-md text-on-surface">SAAS Monitoring</h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Comptes, workspaces, applications, abonnements et sessions.
      </p>

      <nav className="mt-5 mb-5 flex items-center gap-1 overflow-x-auto border-b border-outline-soft">
        {onglets.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
              onglet === o.cle
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {o.icone}
            {o.libelle}
          </button>
        ))}
      </nav>

      {erreur && (
        <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {onglet === "apercu" && apercu && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Comptes", apercu.comptes],
            ["Workspaces", apercu.workspaces],
            ["Applications", apercu.applications],
            ["Activations", apercu.activations],
            ["Abonnements actifs", apercu.abonnements_actifs],
            ["Codes non utilisés", apercu.codes_non_utilises],
            ["Sessions actives", apercu.sessions_actives],
          ].map(([libelle, valeur]) => (
            <div
              key={String(libelle)}
              className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
            >
              <p className="text-label-sm uppercase text-outline">{libelle}</p>
              <p className="mt-1 font-display text-headline-md tabular-nums text-on-surface">
                {valeur}
              </p>
            </div>
          ))}
          <p className="col-span-2 self-center text-label-md text-outline md:col-span-4">
            « Sessions actives » compte les personnes dont un jeton de rafraîchissement est
            encore valable — personne ne signale sa déconnexion en fermant un onglet.
          </p>
        </div>
      )}

      {onglet === "workspaces" && (
        <Tableau
          entetes={["Workspace", "Type", "Membres", "Apps actives", "Créé le"]}
          lignes={workspaces.map((w) => [
            w.name,
            w.type ?? "—",
            String(w.membres),
            String(w.apps_actives),
            w.cree_le ? new Date(w.cree_le).toLocaleDateString("fr-FR") : "—",
          ])}
        />
      )}

      {onglet === "apps" && (
        <div className="overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
          <table className="w-full border-collapse text-body-sm">
            <thead className="bg-surface-row-alt">
              <tr>
                {["Application", "Identifiant", "Visibilité", "Activation", "Workspaces"].map((e) => (
                  <th key={e} className="px-3 py-2 text-left text-label-sm uppercase text-outline">
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t border-hairline">
                  <td className="px-3 py-2 text-on-surface">
                    {a.name}
                    {a.est_systeme && <span className="ml-2 text-label-md text-outline">système</span>}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      title="Copier l'identifiant"
                      onClick={() => {
                        void navigator.clipboard?.writeText(a.uuid);
                        setToast("Identifiant copié.");
                      }}
                      className="inline-flex items-center gap-1 font-mono text-label-md text-outline transition-colors hover:text-primary"
                    >
                      {a.uuid.slice(0, 8)}…
                      <ContentCopyOutlined style={{ fontSize: 13 }} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Visibilité de ${a.name}`}
                      className={CHAMP}
                      value={a.visibilite}
                      onChange={async (e) => {
                        await appsApi.reglerApp(a.id, { visibilite: e.target.value as never });
                        await charger();
                        setToast("Visibilité mise à jour.");
                      }}
                    >
                      {Object.entries(VISIBILITE_LABELS).map(([cle, libelle]) => (
                        <option key={cle} value={cle}>
                          {libelle}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Mode d'activation de ${a.name}`}
                      className={CHAMP}
                      value={a.mode_activation}
                      onChange={async (e) => {
                        await appsApi.reglerApp(a.id, { mode_activation: e.target.value as never });
                        await charger();
                        setToast("Mode d'activation mis à jour.");
                      }}
                    >
                      {Object.entries(MODE_LABELS).map(([cle, libelle]) => (
                        <option key={cle} value={cle}>
                          {libelle}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-on-surface-variant">
                    {a.workspaces_actifs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onglet === "codes" && (
        <CodesPanneau
          apps={apps}
          codes={codes}
          onCree={async (message) => {
            await charger();
            setToast(message);
          }}
          onErreur={setErreur}
        />
      )}

      {onglet === "abonnements" && (
        <Tableau
          entetes={["Workspace", "Application", "Type", "Statut", "Début", "Fin", "Montant"]}
          lignes={abonnements.map((a) => [
            workspaces.find((w) => w.id === a.workspace_id)?.name ?? `#${a.workspace_id}`,
            apps.find((x) => x.id === a.app_id)?.name ?? `#${a.app_id}`,
            a.type,
            a.statut,
            a.debut_le ? new Date(a.debut_le).toLocaleDateString("fr-FR") : "—",
            a.fin_le ? new Date(a.fin_le).toLocaleDateString("fr-FR") : "—",
            a.montant != null ? `${a.montant} ${a.devise ?? ""}` : "—",
          ])}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Tableau({ entetes, lignes }: { entetes: string[]; lignes: string[][] }) {
  if (!lignes.length) {
    return (
      <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
        Rien à afficher.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
      <table className="w-full border-collapse text-body-sm">
        <thead className="bg-surface-row-alt">
          <tr>
            {entetes.map((e) => (
              <th key={e} className="px-3 py-2 text-left text-label-sm uppercase text-outline">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-t border-hairline">
              {l.map((c, j) => (
                <td key={j} className="px-3 py-2 text-on-surface">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodesPanneau({
  apps,
  codes,
  onCree,
  onErreur,
}: {
  apps: AppPlateforme[];
  codes: CodeActivation[];
  onCree: (message: string) => Promise<void>;
  onErreur: (m: string) => void;
}) {
  const [appId, setAppId] = useState<number | "">("");
  const [type, setType] = useState("UNIQUE");
  const [duree, setDuree] = useState(30);
  const [usages, setUsages] = useState(1);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <label className="text-label-md text-outline">
          Application
          <select
            aria-label="Application du code"
            className={`${CHAMP} ml-2 w-[190px]`}
            value={appId}
            onChange={(e) => setAppId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">—</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-label-md text-outline">
          Type
          <select
            aria-label="Type d'abonnement"
            className={`${CHAMP} ml-2`}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="UNIQUE">Achat unique</option>
            <option value="MENSUEL">Mensuel</option>
          </select>
        </label>
        {type === "MENSUEL" && (
          <label className="text-label-md text-outline">
            Durée (jours)
            <input
              type="number"
              aria-label="Durée en jours"
              className={`${CHAMP} ml-2 w-[80px]`}
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
            />
          </label>
        )}
        <label className="text-label-md text-outline">
          Usages
          <input
            type="number"
            aria-label="Nombre d'usages"
            className={`${CHAMP} ml-2 w-[70px]`}
            value={usages}
            onChange={(e) => setUsages(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          disabled={busy || !appId}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await appsApi.creerCode({
                app_id: Number(appId),
                type_abonnement: type,
                duree_jours: type === "MENSUEL" ? duree : null,
                usages_max: usages,
              });
              await onCree(`Code créé : ${r.code}`);
            } catch (e) {
              onErreur(e instanceof Error ? e.message : "Création impossible.");
            } finally {
              setBusy(false);
            }
          }}
          className="h-8 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          Générer
        </button>
      </div>

      <Tableau
        entetes={["Code", "Application", "Type", "Usages", "Expire le"]}
        lignes={codes.map((c) => [
          c.code,
          apps.find((a) => a.id === c.app_id)?.name ?? `#${c.app_id}`,
          c.type_abonnement,
          `${c.usages} / ${c.usages_max}`,
          c.expire_le ? new Date(c.expire_le).toLocaleDateString("fr-FR") : "—",
        ])}
      />
    </div>
  );
}
