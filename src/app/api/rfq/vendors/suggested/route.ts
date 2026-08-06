import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/vendors/suggested?part_id=&solicitation_id= - private vendors
// relevant to a part, tier-ranked and capped (never the whole book)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/vendors/suggested');
}
