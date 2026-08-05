import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/rfq/worklist/assign - bulk (re/un)assign solicitations
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/worklist/assign');
}
