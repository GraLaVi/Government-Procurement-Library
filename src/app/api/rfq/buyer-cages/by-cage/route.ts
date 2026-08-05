import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/buyer-cages/by-cage - CAGE-centric assignment pivot.
// Must exist as a literal route: without it the request falls through to the
// dynamic [userId] proxy (PUT-only) and 405s.
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/buyer-cages/by-cage');
}
