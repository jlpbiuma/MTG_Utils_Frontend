import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async rewrites() {
    const imageServiceUrl = (process.env.IMAGE_SERVICE_URL ?? "http://localhost:8080").replace(/\/$/, "");
    return [
      {
        source: "/images/:path*",
        destination: `${imageServiceUrl}/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
