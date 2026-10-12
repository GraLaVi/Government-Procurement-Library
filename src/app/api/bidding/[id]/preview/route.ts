import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// GET /api/bidding/[id]/preview - the exact upload-file rows
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/preview`);
}
