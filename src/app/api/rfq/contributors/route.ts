import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/contributors - distinct creators of the customer's RFQs
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/contributors');
}
