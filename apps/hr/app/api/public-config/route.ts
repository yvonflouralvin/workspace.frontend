export async function GET() {
  return Response.json({
    networkEncryption: process.env.NETWORK_ENCRYPTION ?? "encrypted",
    networkEncryptionKey: process.env.NETWORK_ENCRYPTION_KEY ?? "",
    workspaceDomain: process.env.WORKSPACE_DOMAIN ?? "http://localhost:3005",
    authDomain: process.env.AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001",
    approvalFlowsDomain: process.env.AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006",
  });
}
