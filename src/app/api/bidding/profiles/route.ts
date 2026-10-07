import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding/profiles - the customer's bidding profiles + allowed CAGEs
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding/profiles');
}
