import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// GET /api/rfq/vendors/[id]
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendors/${id}`);
}

// PATCH /api/rfq/vendors/[id]
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendors/${id}`);
}

// DELETE /api/rfq/vendors/[id] - hard-deletes if never used, else deactivates
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendors/${id}`);
}
