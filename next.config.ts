import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview sandbox domain to trigger HMR without warnings.
  allowedDevOrigins: [
    "*.space-z.ai",
    "localhost:81",
  ],
};

export default nextConfig;
