import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PATCH /api/inventory/items/[id] - inline edit (customer admin; bumps as-of date)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/inventory/items/${encodeURIComponent(id)}`);
}

// DELETE /api/inventory/items/[id] - deactivate a line (customer admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/inventory/items/${encodeURIComponent(id)}`);
}
