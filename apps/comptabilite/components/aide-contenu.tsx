export const AIDE_COMPTES = {
  titre: "Le plan comptable",
  contenu: (
    <>
      <p>
        Le plan comptable est la liste de tous les « tiroirs » où l&rsquo;argent et les
        opérations de l&rsquo;entreprise sont rangés : un compte par nature (ce que je
        possède, ce que je dois, ce que je dépense, ce que je gagne…). Chaque écriture
        comptable déplace un montant entre deux comptes au moins.
      </p>
      <p>
        Les comptes sont classés en 8 <strong>classes</strong>, une convention partagée
        par les référentiels OHADA et PCG français : 1 capitaux, 2 immobilisations,
        3 stocks, 4 tiers (clients/fournisseurs/État), 5 trésorerie (banque, caisse),
        6 charges, 7 produits, 8 autres charges et produits (HAO).
      </p>
      <p>
        Le <strong>sens normal</strong> dit de quel côté un compte grossit naturellement
        (débit pour un compte d&rsquo;actif ou de charge, crédit pour un compte de passif
        ou de produit) — utile pour lire un solde sans se tromper de sens.
      </p>
      <p>
        Un compte <strong>lettrable</strong> (typiquement 411 Clients ou 401 Fournisseurs)
        est un compte de tiers où l&rsquo;on rapproche une facture de son règlement via le
        lettrage, pour repérer ce qui reste impayé.
      </p>
      <p>
        Plutôt que de créer chaque compte à la main, on peut charger un{" "}
        <strong>référentiel</strong> (OHADA, PCG français, une structure vide, ou un
        modèle personnalisé) depuis « Référentiels », dans les Paramètres — le plan reste
        ensuite librement modifiable. Un compte déjà utilisé dans une écriture ne peut
        jamais être supprimé (pour ne pas perdre l&rsquo;historique) — on le
        <strong> désactive</strong> à la place.
      </p>
    </>
  ),
};

export const AIDE_REFERENTIELS = {
  titre: "Les référentiels de plan comptable",
  contenu: (
    <>
      <p>
        Un référentiel est un <strong>modèle</strong> de plan comptable — une liste de
        comptes prête à charger — pas le plan comptable lui-même. Charger un référentiel
        copie ses comptes dans « Plan comptable » ; les deux restent ensuite
        indépendants, on peut modifier le plan sans toucher au référentiel, ou
        inversement.
      </p>
      <p>
        Les référentiels <strong>système</strong> (OHADA, PCG français, structure
        générique vide) sont fournis par la plateforme et ne peuvent pas être modifiés ni
        supprimés — mais on peut en <strong>dupliquer</strong> un en référentiel
        personnalisé pour l&rsquo;adapter.
      </p>
      <p>
        Un référentiel <strong>personnalisé</strong> se construit soit à partir d&rsquo;un
        existant (dupliqué puis retouché), soit vide, puis complété en{" "}
        <strong>important un fichier Excel</strong> (modèle téléchargeable ici) — pratique
        pour reprendre un plan comptable déjà utilisé ailleurs.
      </p>
      <p>
        Charger un référentiel dans le plan comptable est <strong>sans risque</strong> et
        peut se répéter : les comptes déjà présents (même numéro) ne sont jamais
        dupliqués.
      </p>
    </>
  ),
};

export const AIDE_JOURNAUX = {
  titre: "Les journaux",
  contenu: (
    <>
      <p>
        Un journal regroupe les écritures par <strong>origine</strong> — achats, ventes,
        banque, caisse, opérations diverses (OD), à-nouveaux — un peu comme des classeurs
        séparés. Chaque écriture appartient à un seul journal, ce qui permet de retrouver
        rapidement « tout ce qui est passé par la banque » ou « toutes les ventes du
        mois ».
      </p>
      <p>
        Le <strong>numéro d&rsquo;écriture</strong> reprend le code du journal (ex.{" "}
        <span className="font-mono">VE-2026-00001</span>) — la numérotation repart par
        journal et par année.
      </p>
      <p>
        « Journaux par défaut » crée les six journaux standards en un clic ; on peut
        ensuite en ajouter d&rsquo;autres (ex. un journal de banque par compte bancaire).
      </p>
    </>
  ),
};

export const AIDE_EXERCICES = {
  titre: "Les exercices comptables",
  contenu: (
    <>
      <p>
        Un exercice comptable est une <strong>période</strong> (en général 12 mois, mais
        pas obligatoirement calée sur l&rsquo;année civile) sur laquelle on calcule un
        résultat. Une écriture ne peut être saisie ou validée que dans un exercice{" "}
        <strong>ouvert</strong> — le grand livre, la balance et les états financiers se
        calculent toujours pour un exercice donné.
      </p>
      <p>
        <strong>Clôturer</strong> un exercice le verrouille définitivement (aucune
        nouvelle écriture, aucune modification) — c&rsquo;est irréversible depuis cet
        écran, à faire seulement quand la période est réellement terminée et vérifiée.
      </p>
      <p>
        Cette version verrouille au niveau de l&rsquo;exercice entier — pas de clôture par
        mois séparée pour l&rsquo;instant.
      </p>
    </>
  ),
};

export const AIDE_ECRITURES = {
  titre: "Les écritures comptables",
  contenu: (
    <>
      <p>
        Une écriture enregistre un mouvement — une facture, un paiement, une charge — en
        répartissant un montant sur plusieurs <strong>lignes</strong>, chacune sur un
        compte, au <strong>débit</strong> ou au <strong>crédit</strong>. La règle d&rsquo;or
        de la comptabilité en partie double : le total débité doit toujours égaler le
        total crédité, sinon l&rsquo;écriture n&rsquo;est pas équilibrée et ne peut pas
        être enregistrée.
      </p>
      <p>
        Une écriture suit trois états : <strong>brouillon</strong> (modifiable et
        supprimable librement), <strong>validée</strong> (définitive et immuable — plus
        aucune modification possible), <strong>contre-passée</strong> (annulée par une
        écriture miroir aux montants inversés, jamais par une suppression, pour garder une
        trace complète).
      </p>
      <p>
        Le <strong>lettrage</strong> rapproche plusieurs lignes d&rsquo;un même compte de
        tiers (ex. une facture 411 et son règlement) quand leur somme s&rsquo;équilibre —
        utile pour voir en un coup d&rsquo;œil ce qui reste réellement impayé.
      </p>
    </>
  ),
};

export const AIDE_GRAND_LIVRE = {
  titre: "Le grand livre",
  contenu: (
    <>
      <p>
        Le grand livre liste, pour <strong>un compte</strong> donné et sur un exercice, le
        détail chronologique de tous ses mouvements (débit, crédit) avec le{" "}
        <strong>solde cumulé</strong> après chaque ligne — c&rsquo;est la vue « historique
        complet » d&rsquo;un compte, par opposition à la balance qui ne montre que les
        totaux.
      </p>
      <p>
        Utile pour retrouver l&rsquo;origine exacte d&rsquo;un solde, vérifier un compte
        client ou fournisseur ligne par ligne, ou contrôler le lettrage.
      </p>
    </>
  ),
};

export const AIDE_BALANCE = {
  titre: "La balance",
  contenu: (
    <>
      <p>
        La balance liste <strong>tous les comptes</strong> mouvementés sur un exercice
        avec, pour chacun, le total débité, le total crédité, et le solde (débiteur ou
        créditeur) — la vue d&rsquo;ensemble du plan comptable en un seul écran, à
        l&rsquo;inverse du grand livre qui détaille un compte à la fois.
      </p>
      <p>
        C&rsquo;est le premier réflexe de contrôle : en comptabilité en partie double, le
        total des débits doit toujours égaler le total des crédits sur l&rsquo;ensemble de
        la balance.
      </p>
    </>
  ),
};

export const AIDE_ETATS = {
  titre: "Les états financiers",
  contenu: (
    <>
      <p>
        Le <strong>bilan</strong> photographie ce que l&rsquo;entreprise possède et doit à
        un instant donné (comptes de classes 1 à 5 — capitaux, immobilisations, stocks,
        tiers, trésorerie). Le <strong>compte de résultat</strong> mesure la performance
        sur la période (charges et produits, classes 6 et 7) et en tire le résultat
        (bénéfice ou perte).
      </p>
      <p>
        Ces vues sont <strong>simplifiées</strong> — regroupées par classe OHADA — et ne
        remplacent pas une liasse fiscale officielle, qui suit une présentation
        réglementaire précise.
      </p>
    </>
  ),
};

export const AIDE_TAXES = {
  titre: "Les taxes",
  contenu: (
    <>
      <p>
        Une taxe (typiquement la TVA) sert à <strong>ventiler automatiquement</strong> un
        montant TTC en hors-taxes + taxe lors de la comptabilisation d&rsquo;une facture,
        plutôt que de le calculer à la main à chaque fois.
      </p>
      <p>
        Le <strong>compte de collecte</strong> reçoit la taxe facturée à un client (TVA
        collectée), le <strong>compte déductible</strong> reçoit la taxe payée à un
        fournisseur (TVA déductible). « TVA 18% par défaut » crée une taxe standard prête
        à l&rsquo;emploi si le plan comptable contient déjà les comptes correspondants.
      </p>
    </>
  ),
};

export const AIDE_COMPTABILISER = {
  titre: "Comptabiliser une facture de vente",
  contenu: (
    <>
      <p>
        Cet écran relie la Comptabilité aux <strong>Ventes</strong> : il liste les
        factures déjà émises côté facturation, pas encore transformées en écriture
        comptable.
      </p>
      <p>
        « Comptabiliser » calcule automatiquement le hors-taxes à partir du montant TTC et
        du taux de la taxe choisie, puis crée directement une écriture{" "}
        <strong>validée</strong> : le compte client est débité du TTC, le compte de vente
        est crédité du HT, et le compte de TVA collectée du montant de la taxe.
      </p>
      <p>
        Le lien est à sens unique : la Comptabilité lit les factures de Ventes, mais
        n&rsquo;y écrit jamais rien. Une facture déjà comptabilisée est signalée pour
        éviter tout doublon.
      </p>
    </>
  ),
};
