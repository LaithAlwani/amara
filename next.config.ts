import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Placeholder product/lifestyle imagery used by the seed.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Convex file storage (admin-uploaded product images).
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
  },
};

export default nextConfig;
