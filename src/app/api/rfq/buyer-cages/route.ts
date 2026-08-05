import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/buyer-cages - per-user CAGE assignments
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/buyer-cages');
}
