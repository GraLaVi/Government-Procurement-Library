import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/notifications/inbox/settings - current user's in-app bell preferences
export async function GET(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/settings');
}

// PATCH /api/notifications/inbox/settings
export async function PATCH(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/settings');
}
