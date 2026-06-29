import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/rfq/batch/send - send selected/all staged items (one RFQ per vendor)
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/batch/send');
}
