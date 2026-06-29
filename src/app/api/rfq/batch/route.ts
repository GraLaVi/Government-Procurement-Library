import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/batch?added_by_user_id= - list staged cart items
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/batch');
}
