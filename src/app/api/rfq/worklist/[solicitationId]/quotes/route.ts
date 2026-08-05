import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ solicitationId: string }>; }

// GET /api/rfq/worklist/[solicitationId]/quotes - side-by-side quote comparison
export async function GET(request: NextRequest, { params }: Ctx) {
  const { solicitationId } = await params;
  return backendProxy(request, `/rfq/worklist/${solicitationId}/quotes`);
}
