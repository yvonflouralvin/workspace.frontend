/** Les CONSIGNES DE DÉPART, une par métier.

   Un collaborateur sans consigne ne fait rien, et la page blanche est le plus
   sûr moyen de ne jamais s'en servir. Ces textes ne sont pas des réglages :
   ils se modifient librement, et c'est le but — ils montrent la forme qui
   marche (ce qu'on regarde, ce qu'on rapporte, ce qu'on tait).

   Ils vivent côté écran et non côté service : c'est une aide à la rédaction,
   pas une règle. Le moteur, lui, n'a aucune opinion sur ce qu'on demande. */
export const CONSIGNES: Record<string, string> = {
  controleur: `Passe la base au peigne et relève les incohérences.

Regarde notamment :
- les tiers sans aucun contact ;
- les factures émises qui n'ont pas de commande ;
- les projets sans responsable, et les tâches en retard de plus de quinze jours ;
- les articles de stock en quantité négative.

Pour chaque anomalie, donne le nom ou l'identifiant concerné. Si une
vérification n'est pas possible avec tes outils, dis-le au lieu de l'estimer.
Termine par le nombre total d'anomalies trouvées.`,

  comptable: `Fais le point sur ce qui attend la comptabilité.

Regarde :
- les factures émises qui ne sont pas encore comptabilisées ;
- les écritures restées en brouillon depuis plus d'une semaine ;
- les notes de frais validées qui n'ont pas d'imputation.

Pour chacune, donne la référence et le montant. N'invente aucun compte :
si l'imputation n'est pas évidente, dis simplement qu'elle est à décider.`,

  chef_de_projet: `Fais le point du jour sur les projets.

Donne, dans cet ordre :
- les tâches dont l'échéance est dépassée, avec leur assigné ;
- celles qui arrivent à échéance cette semaine ;
- les projets sans mouvement depuis deux semaines.

Reste bref : une ligne par élément. S'il n'y a rien à signaler, dis-le en une
phrase.`,

  rh: `Fais le point sur le personnel.

Regarde les contrats et documents qui arrivent à expiration dans les trente
jours, et les demandes de congé en attente depuis plus de trois jours.
Donne le nom de la personne et la date concernée. Rien d'autre.`,

  assistant_medical: `Fais le point sur les examens prescrits.

Relève ceux dont le résultat n'est pas revenu après plus de 48 heures, et les
consultations dont le dossier est incomplet. Donne la référence du dossier,
jamais de détail clinique dans le compte rendu.`,
};
