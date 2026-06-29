import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/settings/me - current user's RFQ notification preferences
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/settings/me');
}

// PATCH /api/rfq/settings/me
export async function PATCH(request: NextRequest) {
  return backendProxy(request, '/rfq/settings/me');
}
