import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@hivemind/support'],
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
