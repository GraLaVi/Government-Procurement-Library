import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/received - RFQs addressed to the responder's vendor CAGE
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/received');
}
