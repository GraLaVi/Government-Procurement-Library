import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// PATCH /api/rfq/batch/items/[id]
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/batch/items/${id}`);
}

// DELETE /api/rfq/batch/items/[id]
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/batch/items/${id}`);
}
