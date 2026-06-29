import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@repo/network", "@repo/auth"],
  output: "standalone",
};

export default nextConfig;
