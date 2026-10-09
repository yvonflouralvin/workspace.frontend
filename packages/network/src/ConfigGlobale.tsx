import { configReseauDepuisEnv } from "./config.js";

/** Pose la configuration du conteneur dans une variable globale, AVANT que le
 *  code de l'application ne s'exécute.
 *
 *  POURQUOI UN SCRIPT ET PAS SEULEMENT LE DÉPÔT PAR `SessionProvider` : les
 *  coquilles d'application déclarent leurs liens dans des constantes de MODULE
 *  (`NAV_ITEMS`), évaluées au chargement du chunk — donc avant tout rendu React.
 *  Un dépôt au rendu arrive trop tard pour elles. Ce script, lui, s'exécute à
 *  l'analyse du document.
 *
 *  Composant SERVEUR : il lit `process.env` à chaque requête. Rendu dans le
 *  layout racine. */
export function ConfigGlobale() {
  const config = configReseauDepuisEnv();
  return (
    <script
      id="wd-config"
      // Les valeurs viennent de notre propre environnement, jamais d'une entrée
      // utilisateur ; `JSON.stringify` suffit à produire du JavaScript valide.
      // `</script>` est néanmoins neutralisé : une valeur mal saisie dans un
      // .env ne doit pas pouvoir fermer la balise.
      dangerouslySetInnerHTML={{
        __html: `window.__WD_CONFIG__=${JSON.stringify(config).replace(/</g, "\\u003c")}`,
      }}
    />
  );
}
