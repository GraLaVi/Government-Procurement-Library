import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/notifications/inbox/bid-matches/seen - advance the bid-match watermark
export async function POST(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/bid-matches/seen');
}
