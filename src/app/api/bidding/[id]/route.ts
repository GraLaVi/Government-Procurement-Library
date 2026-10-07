import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// GET /api/bidding/[id] - the bid with its lines, products and validation
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}`);
}

// PATCH /api/bidding/[id] - edit header fields of a draft
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}`);
}

// DELETE /api/bidding/[id] - delete a draft
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}`);
}
