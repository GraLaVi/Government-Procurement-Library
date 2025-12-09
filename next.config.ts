import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Using --webpack flag in dev script to disable Turbopack
  // due to a bug causing fetch() to hang in API routes
};

export default nextConfig;
