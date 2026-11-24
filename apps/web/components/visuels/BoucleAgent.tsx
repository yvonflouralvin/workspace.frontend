/** LA BOUCLE DE DÉLÉGATION, dessinée telle qu'elle fonctionne vraiment.
 *
 *  C'est le seul schéma du site, et il porte le différenciateur du produit :
 *  un collaborateur virtuel qui ne sait pas répondre ne rend pas une
 *  demi-réponse — il demande à qui sait, se met en attente, et c'est LUI qui
 *  revient conclure dans la conversation où on l'avait sollicité.
 *
 *  LE RETOUR EST LA MOITIÉ QUI COMPTE, et c'est pour ça qu'il est dessiné en
 *  grand, en bas, d'un bout à l'autre. Sans lui, la réponse du spécialiste
 *  resterait dans la conversation des deux agents — c'est exactement le
 *  défaut qu'on a corrigé, et un schéma qui montrerait seulement trois
 *  flèches vers la droite raconterait la panne au lieu du produit.
 *
 *  Le signal est un tiret qui court le long des fils, décalé par fil, donc
 *  on lit une SUITE. Les coordonnées sont écrites à la main : un schéma de
 *  cette taille est un dessin, pas une donnée, et une mise en page calculée
 *  serait illisible pour qui le reprendra.
 */
const NOEUDS = [
  {
    x: 60,
    y: 96,
    l: 152,
    titre: "Vous",
    sous: "« Fais-moi le point »",
    teinte: "var(--color-primary-fixed-dim)",
  },
  {
    x: 384,
    y: 96,
    l: 152,
    titre: "Le collaborateur",
    sous: "Ouvre sa tâche",
    teinte: "var(--color-secondary-fixed-dim)",
  },
  {
    x: 708,
    y: 96,
    l: 152,
    titre: "Le spécialiste",
    sous: "Humain ou virtuel",
    teinte: "var(--color-tertiary-fixed-dim)",
  },
] as const;

export function BoucleAgent() {
  return (
    <figure className="relative">
      <svg
        viewBox="0 0 920 360"
        role="img"
        aria-labelledby="boucle-titre boucle-desc"
        className="w-full"
      >
        <title id="boucle-titre">Le trajet d&apos;une demande confiée à un collaborateur virtuel</title>
        <desc id="boucle-desc">
          Vous écrivez au collaborateur ; il ouvre une tâche à son nom, demande au spécialiste
          ce qui lui manque et se met en attente ; quand la réponse arrive, il reprend son
          travail et rend le point complet dans votre conversation.
        </desc>

        <defs>
          <linearGradient id="fil" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--halo-indigo)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--halo-bleu)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="fil-retour" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--halo-vert)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-secondary-fixed-dim)" stopOpacity="0.9" />
          </linearGradient>
          {/* Le lustre d'une carte : un liseré clair en haut, qui la fait
              paraître éclairée par le dessus plutôt que découpée. */}
          <linearGradient id="lustre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Les fils, puis le signal par-dessus ──
            Deux tracés superposés pour chaque liaison : le fil éteint reste
            visible quand l'animation est coupée, et le signal n'a plus qu'à
            courir dessus. */}
        {[
          { d: "M212 136 H384", retard: "0s" },
          { d: "M536 136 H708", retard: "1.1s" },
        ].map((fil) => (
          <g key={fil.d}>
            <path d={fil.d} stroke="url(#fil)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path
              d={fil.d}
              stroke="var(--color-primary-fixed)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              className="anim-signal"
              style={{ animationDelay: fil.retard, animationDuration: "3s" }}
            />
          </g>
        ))}

        {/* Les pointes de flèche des deux liaisons avant. */}
        {[378, 702].map((x) => (
          <path
            key={x}
            d={`M${x - 7} 130 L${x} 136 L${x - 7} 142`}
            fill="none"
            stroke="var(--halo-bleu)"
            strokeOpacity="0.9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* ── L'attente, sous le collaborateur ── */}
        <path
          d="M460 184 V226"
          stroke="var(--nuit-filet)"
          strokeWidth="2"
          strokeDasharray="4 6"
          fill="none"
        />
        <g className="anim-etape" style={{ animationDelay: "2.2s" }}>
          <rect
            x="352"
            y="226"
            width="216"
            height="46"
            rx="14"
            fill="var(--nuit-elevee)"
            stroke="var(--nuit-filet)"
          />
          <circle cx="378" cy="249" r="5" fill="var(--color-status-review)" className="anim-pulse" />
          <text
            x="394"
            y="254"
            fill="var(--nuit-texte-doux)"
            style={{ font: "500 14px var(--font-sans)" }}
          >
            Il attend — il ne répond pas
          </text>
        </g>

        {/* ── LE RETOUR, d'un bout à l'autre ── */}
        <path
          d="M784 184 V304 Q784 320 768 320 H152 Q136 320 136 304 V184"
          stroke="url(#fil-retour)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M784 184 V304 Q784 320 768 320 H152 Q136 320 136 304 V184"
          stroke="var(--color-secondary-fixed)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="anim-signal"
          style={{ animationDelay: "2.4s", animationDuration: "4.2s" }}
        />
        <path
          d="M130 192 L136 184 L142 192"
          fill="none"
          stroke="var(--color-secondary-fixed)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="anim-etape" style={{ animationDelay: "4.4s" }}>
          <rect
            x="300"
            y="296"
            width="320"
            height="48"
            rx="14"
            fill="var(--nuit-carte)"
            stroke="var(--color-secondary-fixed-dim)"
            strokeOpacity="0.5"
          />
          <text
            x="460"
            y="325"
            textAnchor="middle"
            fill="var(--color-secondary-fixed)"
            style={{ font: "600 14px var(--font-sans)" }}
          >
            Le point complet, dans VOTRE conversation
          </text>
        </g>

        {/* ── Les trois nœuds, par-dessus les fils ── */}
        {NOEUDS.map((n) => (
          <g key={n.titre}>
            <rect
              x={n.x}
              y={n.y}
              width={n.l}
              height="88"
              rx="18"
              fill="var(--nuit-carte)"
              stroke="var(--nuit-filet)"
            />
            <rect x={n.x} y={n.y} width={n.l} height="88" rx="18" fill="url(#lustre)" />
            <circle cx={n.x + 28} cy={n.y + 30} r="9" fill={n.teinte} fillOpacity="0.25" />
            <circle cx={n.x + 28} cy={n.y + 30} r="4" fill={n.teinte} />
            <text
              x={n.x + 48}
              y={n.y + 35}
              fill="var(--nuit-texte)"
              style={{ font: "600 15px var(--font-display)" }}
            >
              {n.titre}
            </text>
            <text
              x={n.x + 28}
              y={n.y + 64}
              fill="var(--nuit-texte-doux)"
              style={{ font: "400 13px var(--font-sans)" }}
            >
              {n.sous}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="mt-lg text-body-sm text-[color:var(--nuit-texte-doux)]">
        Sans la boucle de retour, la réponse du spécialiste resterait dans la conversation des
        deux collaborateurs — et la personne qui avait demandé devrait revenir relancer. C&apos;est
        exactement ce qu&apos;elle évitait en confiant le travail.
      </figcaption>
    </figure>
  );
}
