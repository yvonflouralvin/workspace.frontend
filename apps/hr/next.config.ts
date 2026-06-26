import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@repo/ui"],
  output: "standalone",
  experimental: { instrumentationHook: true },
};

export default nextConfig;
