export async function GET() {
  return Response.json({
    networkEncryption: process.env.NETWORK_ENCRYPTION ?? "encrypted",
    networkEncryptionKey: process.env.NETWORK_ENCRYPTION_KEY ?? "",
    workspaceDomain: process.env.WORKSPACE_DOMAIN ?? "http://localhost:3005",
    // Instance dédiée à un client : pas d'inscription libre. Lu ici (server-side, plain —
    // pas de NEXT_PUBLIC_*) car les pages anonymes (connexion, inscription) le demandent
    // AVANT toute session ; ce que /auth/session sait déjà sert le reste de la plateforme.
    selfHostedInstance: process.env.SELF_HOSTED_INSTANCE === "true",
  });
}
