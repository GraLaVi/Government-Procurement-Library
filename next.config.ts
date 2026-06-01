import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev defaults to Turbopack (small, split chunks — usable over a remote
  // connection). An older Turbopack version had a bug where fetch() hung in
  // API routes; if it resurfaces, fall back with `npm run dev:webpack`.

  // Enable standalone output for Docker deployment
  output: 'standalone',
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
