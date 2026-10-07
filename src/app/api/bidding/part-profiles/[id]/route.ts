import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// GET /api/bidding/part-profiles/[id]
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/part-profiles/${encodeURIComponent(id)}`);
}

// DELETE /api/bidding/part-profiles/[id]
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/part-profiles/${encodeURIComponent(id)}`);
}
