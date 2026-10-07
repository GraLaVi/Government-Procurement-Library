import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding - the Send bids list (?tab=&added_by_user_id=&q=&page=&page_size=)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding');
}

// POST /api/bidding - start a bid (or open the one that already exists)
export async function POST(request: NextRequest) {
  return backendProxy(request, '/bidding');
}
