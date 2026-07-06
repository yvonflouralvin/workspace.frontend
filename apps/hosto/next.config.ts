import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@repo/ui", "@repo/network", "@repo/auth"],
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./node_modules/next/dist/compiled/cookie/**"],
  },
};

export default nextConfig;
