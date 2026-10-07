import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// POST /api/bidding/[id]/withdraw - take a sent bid back before upload
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/withdraw`);
}
