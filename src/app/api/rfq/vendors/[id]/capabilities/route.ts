import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// GET /api/rfq/vendors/[id]/capabilities - the vendor's matching lists
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendors/${id}/capabilities`);
}

// PUT /api/rfq/vendors/[id]/capabilities - replace-set per list
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/vendors/${id}/capabilities`);
}
