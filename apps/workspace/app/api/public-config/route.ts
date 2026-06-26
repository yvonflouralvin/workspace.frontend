export async function GET() {
  return Response.json({
    networkEncryption: process.env.NETWORK_ENCRYPTION ?? "encrypted",
    networkEncryptionKey: process.env.NETWORK_ENCRYPTION_KEY ?? "",
    authDomain: process.env.AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001",
    hrDomain: process.env.AUTH_API_HR_DOMAIN ?? "http://localhost:3003",
    approvalFlowsDomain: process.env.AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006",
  });
}
