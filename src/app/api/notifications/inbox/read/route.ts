import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/notifications/inbox/read - mark given ids read
export async function POST(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/read');
}
