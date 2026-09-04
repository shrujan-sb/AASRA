import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      { source: "/console/ai", destination: "/console/predict", permanent: false },
      { source: "/console/ai/:path*", destination: "/console/predict/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
