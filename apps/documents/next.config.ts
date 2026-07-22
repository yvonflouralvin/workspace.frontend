import type { NextConfig } from "next";

const allowedDevOrigins = ["127.0.0.1", "localhost"];
if (process.env.DOCUMENTS_APP_URL) {
  try { allowedDevOrigins.push(new URL(process.env.DOCUMENTS_APP_URL).host); } catch {}
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: ["@repo/ui", "@repo/network", "@repo/auth", "@repo/notifications"],
  output: "standalone",
};

export default nextConfig;
