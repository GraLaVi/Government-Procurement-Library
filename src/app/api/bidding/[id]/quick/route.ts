import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// PATCH /api/bidding/[id]/quick - inline price and delivery on a single-line draft
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/quick`);
}
