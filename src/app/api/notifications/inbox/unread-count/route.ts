import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/notifications/inbox/unread-count
export async function GET(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/unread-count');
}
