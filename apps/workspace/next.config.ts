import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@repo/ui"],
};

export default nextConfig;
