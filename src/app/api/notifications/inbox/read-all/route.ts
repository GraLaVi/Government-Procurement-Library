import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/notifications/inbox/read-all
export async function POST(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/read-all');
}
