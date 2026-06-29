import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// PATCH /api/rfq/vendor-contacts/[id]
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendor-contacts/${id}`);
}

// DELETE /api/rfq/vendor-contacts/[id]
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendor-contacts/${id}`);
}
