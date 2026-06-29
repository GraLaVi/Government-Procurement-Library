import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq - list the customer's RFQs
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq');
}
