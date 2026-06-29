import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/rfq/quick-send - compose + send (one RFQ per vendor)
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/quick-send');
}
