import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding/ready - priced RFQ worklist rows with no bid yet
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding/ready');
}
