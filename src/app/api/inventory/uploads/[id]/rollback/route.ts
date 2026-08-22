import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/inventory/uploads/[id]/rollback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/inventory/uploads/${encodeURIComponent(id)}/rollback`);
}
