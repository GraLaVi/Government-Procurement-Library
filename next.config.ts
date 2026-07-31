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

  async redirects() {
    return [
      // Buyer RFQ pages moved out of /dashboard (July 2026). Old links live
      // on in sent emails, stored bell notifications, and bookmarks.
      {
        source: '/dashboard/rfq',
        destination: '/rfq',
        permanent: true,
      },
      {
        source: '/dashboard/rfq/:path*',
        destination: '/rfq/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
