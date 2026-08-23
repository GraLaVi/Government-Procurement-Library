import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/inventory/settings - sharing/staleness/mapping config (any member)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/inventory/settings');
}

// PUT /api/inventory/settings - partial update (customer admin)
export async function PUT(request: NextRequest) {
  return backendProxy(request, '/inventory/settings');
}
