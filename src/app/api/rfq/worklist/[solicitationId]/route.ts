import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ solicitationId: string }>; }

// PATCH /api/rfq/worklist/[solicitationId] - work status / assignee / notes
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { solicitationId } = await params;
  return backendProxy(request, `/rfq/worklist/${solicitationId}`);
}
