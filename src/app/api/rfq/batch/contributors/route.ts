import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/batch/contributors - distinct users who staged items
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/batch/contributors');
}
