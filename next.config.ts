import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosts allowed to request dev-only resources (/_next/hmr and friends).
  // These apps are served from a remote box and browsed over its public IP, so
  // every HMR request looks cross-origin to Next. That began being blocked by
  // default somewhere in the 16.1 -> 16.3.6 bump taken for the npm advisories.
  // Dev only: production runs the standalone server, which has no HMR at all.
  allowedDevOrigins: ['137.184.108.143', '10.116.0.2'],
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
      // The Documentation placeholder was replaced by the Help Center (June
      // 2026). Kept as a redirect so old inbound links and bookmarks resolve.
      {
        source: '/documentation',
        destination: '/help',
        permanent: true,
      },
      // Inventory moved from the account area to the Library (August 2026,
      // pre-launch — external links barely exist, this is insurance for
      // bookmarks and stored notifications).
      {
        source: '/account/inventory',
        destination: '/library/inventory',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
