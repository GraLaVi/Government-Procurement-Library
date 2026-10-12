import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/bidding/send - queue drafts for upload to DIBBS
export async function POST(request: NextRequest) {
  return backendProxy(request, '/bidding/send');
}
