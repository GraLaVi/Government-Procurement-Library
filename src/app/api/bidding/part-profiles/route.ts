import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding/part-profiles - saved part answers (?cage_code=&q=&page=&page_size=)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding/part-profiles');
}

// PUT /api/bidding/part-profiles - create or replace the answers for one part
export async function PUT(request: NextRequest) {
  return backendProxy(request, '/bidding/part-profiles');
}
