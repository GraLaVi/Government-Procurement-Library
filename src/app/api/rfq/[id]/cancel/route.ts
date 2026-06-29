import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// POST /api/rfq/[id]/cancel
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/${id}/cancel`, { forwardBody: false });
}
