import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ solicitationId: string }>; }

// POST /api/rfq/worklist/[solicitationId]/stock-quote - "Use my stock":
// create an internal quote from the buyer's own inventory (no vendor
// contacted). Body: { part_id }.
export async function POST(request: NextRequest, { params }: Ctx) {
  const { solicitationId } = await params;
  return backendProxy(request, `/rfq/worklist/${solicitationId}/stock-quote`);
}
