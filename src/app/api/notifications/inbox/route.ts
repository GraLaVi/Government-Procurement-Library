import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/notifications/inbox - recent bell notifications (grouped per prefs)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox');
}
