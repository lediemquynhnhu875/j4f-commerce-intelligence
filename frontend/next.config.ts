import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Real product media for the imported sample lives on Tiki's CDN. Images are
    // rendered unoptimized so the Next server never proxies external assets;
    // these patterns keep the hosts explicit and allow enabling optimization.
    remotePatterns: [
      { protocol: "https", hostname: "salt.tikicdn.com", pathname: "/**" },
      { protocol: "https", hostname: "sand.tikicdn.com", pathname: "/**" },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
