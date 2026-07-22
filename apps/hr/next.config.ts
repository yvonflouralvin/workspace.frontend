import type { NextConfig } from "next";

// Next 16 bloque en dev les ressources internes servies à une origine non listée.
// L'app tourne derrière nginx sur son domaine public (HR_APP_URL).
const allowedDevOrigins = ["127.0.0.1", "localhost"];
if (process.env.HR_APP_URL) {
  try {
    allowedDevOrigins.push(new URL(process.env.HR_APP_URL).host);
  } catch {}
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: ["@repo/ui", "@repo/network", "@repo/auth", "@repo/notifications"],
  output: "standalone",
};

export default nextConfig;
