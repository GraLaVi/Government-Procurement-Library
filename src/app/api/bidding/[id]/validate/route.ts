import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// POST /api/bidding/[id]/validate - re-run validation
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/validate`);
}
