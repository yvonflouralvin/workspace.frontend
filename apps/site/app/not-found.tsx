/** Le 404 d'un domaine qui ne mène nulle part.
 *
 *  Volontairement muet sur la plateforme : cette page peut être servie sur le
 *  domaine d'un client dont le DNS pointe déjà chez nous alors que le site
 *  n'est pas publié. Elle ne doit ni faire notre publicité, ni révéler qu'un
 *  site existe ici. */
export default function Introuvable() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#334155",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <p style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>404</p>
        <p style={{ fontSize: 16, color: "#64748b" }}>Cette page n'existe pas.</p>
      </div>
    </div>
  );
}
