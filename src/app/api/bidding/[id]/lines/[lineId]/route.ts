import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string; lineId: string }>; }

// PUT /api/bidding/[id]/lines/[lineId] - edit one line of a draft
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id, lineId } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}`);
}
