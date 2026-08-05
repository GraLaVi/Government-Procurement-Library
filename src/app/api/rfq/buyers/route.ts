import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/buyers - assignable buyers (Enterprise seat holders flagged)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/buyers');
}
