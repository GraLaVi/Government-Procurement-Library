import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/vendor-stats?cage_codes=&rfq_vendor_ids=&months= - responsiveness
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/vendor-stats');
}
