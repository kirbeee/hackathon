import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev mode blocks cross-origin requests to dev-only assets/endpoints by
  // default (only `localhost` is trusted). Without this, hydration silently
  // fails for anyone loading the app through the sandbox's own IP or a
  // Cloudflare quick tunnel (a new *.trycloudflare.com host each run).
  allowedDevOrigins: ["203.145.205.92", "*.trycloudflare.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
