import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/inventory/items - my inventory catalog (q / match_status / paging)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/inventory/items');
}
