import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string; productId: string }>; }

// PUT /api/bidding/[id]/products/[productId] - edit one item's answers
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id, productId } = await params;
  return backendProxy(request, `/bidding/${encodeURIComponent(id)}/products/${encodeURIComponent(productId)}`);
}
