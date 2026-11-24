/** L'ESPACE DE TRAVAIL, MONTRÉ PLUTÔT QUE DÉCRIT.
 *
 *  POURQUOI UN DESSIN ET NON UNE CAPTURE D'ÉCRAN. Une capture se périme au
 *  premier changement d'interface, pèse quelques centaines de kilooctets,
 *  devient illisible sur un téléphone et ne dit rien à un lecteur d'écran.
 *  Celle-ci est du texte et des bordures : elle suit la largeur de l'écran,
 *  hérite des couleurs de la marque, pèse zéro téléchargement — et elle met
 *  en avant exactement ce qu'on veut montrer d'abord.
 *
 *  CE QU'ELLE MONTRE EST VRAI. Les statuts, leurs couleurs, la tâche ouverte
 *  au nom d'un collaborateur, la mention « attend une réponse » : tout existe
 *  dans le produit. Un visuel qui promet un écran qui n'existe pas se paie au
 *  premier essai.
 *
 *  `aria-hidden` : c'est une illustration. Le texte qui l'entoure dit la même
 *  chose en meilleur français, et faire lire à voix haute une maquette
 *  n'apporte rien à qui ne la voit pas.
 */
const TACHES = [
  {
    titre: "Point du matin — tous les projets",
    qui: "DG-ia",
    agent: true,
    statut: "Attend une réponse",
    teinte: "var(--color-status-review)",
    fond: "var(--color-status-review-container)",
  },
  {
    titre: "Relever les écritures en brouillon",
    qui: "Comptable-ia",
    agent: true,
    statut: "Terminée",
    teinte: "var(--color-status-done)",
    fond: "var(--color-status-done-container)",
  },
  {
    titre: "Valider la facture Bralima",
    qui: "Émilie",
    agent: false,
    statut: "En cours",
    teinte: "var(--color-status-doing)",
    fond: "var(--color-status-doing-container)",
  },
] as const;

const MODULES = [
  "Espace de travail",
  "Facturation",
  "Comptabilité",
  "Ressources humaines",
  "Collaborateurs",
] as const;

export function Console() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="carte-nuit overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgb(0_0_0_/_0.9)]">
        {/* ── La barre de fenêtre ── */}
        <div className="flex items-center gap-sm border-b border-[color:var(--nuit-filet)] px-md py-sm">
          <span className="flex gap-[6px]">
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} className="h-[9px] w-[9px] rounded-full" style={{ background: c }} />
            ))}
          </span>
          <span className="ml-sm flex-1 truncate rounded-md bg-[color:var(--nuit)]/70 px-sm py-[3px] text-center text-label-sm normal-case tracking-normal text-[color:var(--nuit-texte-doux)]">
            workspace.saas.cd
          </span>
        </div>

        <div className="flex">
          {/* ── La barre latérale ── */}
          <div className="hidden w-[168px] shrink-0 border-r border-[color:var(--nuit-filet)] p-sm sm:block">
            {MODULES.map((m, i) => (
              <div
                key={m}
                className={`mb-[2px] flex items-center gap-sm rounded-lg px-sm py-[7px] text-body-sm ${
                  i === 0
                    ? "bg-[color:var(--halo-indigo)]/25 text-[color:var(--nuit-texte)]"
                    : "text-[color:var(--nuit-texte-doux)]"
                }`}
              >
                <span
                  className="h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{
                    background: i === 0 ? "var(--color-primary-fixed-dim)" : "var(--nuit-filet)",
                  }}
                />
                <span className="truncate">{m}</span>
              </div>
            ))}
          </div>

          {/* ── Les tâches ── */}
          <div className="min-w-0 flex-1 p-md">
            <div className="mb-md flex items-center justify-between">
              <span className="font-display text-body-md font-semibold text-[color:var(--nuit-texte)]">
                Mes tâches
              </span>
              <span className="rounded-full border border-[color:var(--nuit-filet)] px-sm py-[2px] text-label-sm normal-case tracking-normal text-[color:var(--nuit-texte-doux)]">
                3 aujourd&apos;hui
              </span>
            </div>

            <div className="flex flex-col gap-sm">
              {TACHES.map((t, i) => (
                <div
                  key={t.titre}
                  className="anim-etape rounded-xl border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)] p-sm"
                  style={{ animationDelay: `${i * 1.4}s` }}
                >
                  <div className="flex items-start justify-between gap-sm">
                    <span className="min-w-0 text-body-sm leading-snug text-[color:var(--nuit-texte)]">
                      {t.titre}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-sm py-[2px] text-label-sm normal-case tracking-normal"
                      style={{ background: t.fond, color: t.teinte }}
                    >
                      {t.statut}
                    </span>
                  </div>
                  <div className="mt-sm flex items-center gap-xs">
                    <span
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold"
                      style={{
                        background: t.agent
                          ? "var(--halo-indigo)"
                          : "var(--color-role-member-container)",
                        color: t.agent ? "#fff" : "var(--color-role-member)",
                      }}
                    >
                      {t.qui.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-label-md normal-case tracking-normal text-[color:var(--nuit-texte-doux)]">
                      {t.qui}
                      {t.agent && " · collaborateur virtuel"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Le panneau du collaborateur ──
              Masqué sous 1024 px : à cette largeur il deviendrait une colonne
              de six caractères, ce qui ne montre plus rien. */}
          <div className="hidden w-[232px] shrink-0 border-l border-[color:var(--nuit-filet)] p-md lg:block">
            <div className="flex items-center gap-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--halo-indigo)] text-[10px] font-bold text-white">
                DG
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body-sm font-semibold text-[color:var(--nuit-texte)]">
                  DG-ia
                </span>
                <span className="flex items-center gap-xs text-label-sm normal-case tracking-normal text-[color:var(--color-secondary-fixed-dim)]">
                  <span className="anim-pulse h-[6px] w-[6px] rounded-full bg-[color:var(--color-secondary-fixed-dim)]" />
                  au travail
                </span>
              </span>
            </div>

            <div className="mt-md flex flex-col gap-sm">
              {[
                "J'ouvre ma tâche et je rassemble les cinq projets.",
                "Il me manque la trésorerie — je demande au comptable.",
                "Réponse reçue. Je consolide et je vous réponds.",
              ].map((ligne, i) => (
                <p
                  key={ligne}
                  className="anim-etape rounded-xl rounded-tl-sm bg-[color:var(--nuit)]/70 p-sm text-body-sm leading-snug text-[color:var(--nuit-texte-doux)]"
                  style={{ animationDelay: `${i * 3}s` }}
                >
                  {ligne}
                  {i === 2 && (
                    <span className="anim-curseur ml-[2px] inline-block h-[0.9em] w-[2px] translate-y-[1px] bg-[color:var(--color-secondary-fixed-dim)]" />
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
