import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/coverage - coverage/aging summary for the work queue
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/coverage');
}
