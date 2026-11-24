/** « UN SEUL SOCLE » — l'argument central, rendu visible.
 *
 *  C'est la phrase que tout éditeur de logiciel écrit et que personne ne
 *  prouve. Elle se prouve en NOMMANT ce qui est partagé : les mêmes membres,
 *  les mêmes droits, les mêmes clients, les mêmes notifications, le même
 *  journal. Cinq choses précises valent mieux que le mot « intégré ».
 *
 *  Le dessin est en CSS et non en SVG, à l'inverse de la boucle de
 *  délégation : ici la mise en page doit SE REPLIER sur un téléphone — six
 *  tuiles passent de six colonnes à deux — et un `viewBox` fixe l'aurait
 *  interdit. Le schéma de la boucle, lui, est un dessin dont les proportions
 *  ne doivent pas bouger.
 */
const TUILES = [
  "Facturation",
  "Comptabilité",
  "Ressources humaines",
  "Projets",
  "Stock",
  "Site web",
] as const;

const PARTAGE = [
  { l: "Les mêmes membres", d: "Un employé entre une fois" },
  { l: "Les mêmes droits", d: "Par groupe, partout" },
  { l: "Les mêmes clients", d: "Un répertoire, pas six" },
  { l: "Les mêmes alertes", d: "Une seule boîte" },
  { l: "Le même journal", d: "Qui a fait quoi, daté" },
] as const;

export function Socle() {
  return (
    <div className="relative">
      {/* ── Les modules ── */}
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-6">
        {TUILES.map((t) => (
          <div
            key={t}
            className="rounded-xl border border-outline-soft bg-surface-container-lowest px-sm py-md text-center shadow-card transition-colors hover:border-primary/30"
          >
            <span className="text-body-sm font-medium text-on-surface">{t}</span>
          </div>
        ))}
      </div>

      {/* ── Les attaches ──
          Six traits qui descendent vers le socle. Ils disparaissent sous
          `sm` : avec deux colonnes, six traits deviendraient un peigne qui ne
          relie plus rien de lisible. */}
      <div className="hidden grid-cols-6 lg:grid">
        {TUILES.map((t) => (
          <div key={t} className="flex justify-center">
            <span className="h-6 w-px bg-gradient-to-b from-outline-variant to-primary/50" />
          </div>
        ))}
      </div>
      <div className="h-md lg:hidden" />

      {/* ── Le socle ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.04] p-lg">
        {/* Le signal qui parcourt le socle : ce qui est partagé circule. */}
        <svg
          viewBox="0 0 1000 2"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] w-full"
        >
          <path d="M0 1 H1000" stroke="var(--color-primary)" strokeOpacity="0.18" strokeWidth="2" />
          <path
            d="M0 1 H1000"
            stroke="var(--color-primary)"
            strokeWidth="2"
            className="anim-signal"
            style={{ animationDuration: "6s" }}
          />
        </svg>

        <p className="text-label-sm uppercase text-primary">Le socle, partagé par tous</p>
        <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-5">
          {PARTAGE.map((p) => (
            <div key={p.l}>
              <p className="text-body-md font-semibold text-on-surface">{p.l}</p>
              <p className="mt-[2px] text-body-sm text-on-surface-variant">{p.d}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-md text-body-sm text-on-surface-variant">
        C&apos;est la différence avec six logiciels qu&apos;on fait dialoguer : il n&apos;y a
        rien à faire dialoguer.
      </p>
    </div>
  );
}
