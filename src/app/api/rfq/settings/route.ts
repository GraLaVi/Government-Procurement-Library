import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/settings - per-customer RFQ config (lazy-created)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/settings');
}

// PATCH /api/rfq/settings
export async function PATCH(request: NextRequest) {
  return backendProxy(request, '/rfq/settings');
}
