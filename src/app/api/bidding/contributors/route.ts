import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding/contributors - the "Added by" filter options
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding/contributors');
}
