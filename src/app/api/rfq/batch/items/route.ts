import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/rfq/batch/items - stage items into the cart
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/batch/items');
}
