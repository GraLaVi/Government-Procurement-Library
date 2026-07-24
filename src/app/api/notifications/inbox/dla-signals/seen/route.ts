import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/notifications/inbox/dla-signals/seen - advance the DLA demand-signal watermark
export async function POST(request: NextRequest) {
  return backendProxy(request, '/notifications/inbox/dla-signals/seen');
}
