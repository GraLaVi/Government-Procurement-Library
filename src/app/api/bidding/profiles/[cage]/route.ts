import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ cage: string }>; }

// GET /api/bidding/profiles/[cage]
export async function GET(request: NextRequest, { params }: Ctx) {
  const { cage } = await params;
  return backendProxy(request, `/bidding/profiles/${encodeURIComponent(cage)}`);
}

// PUT /api/bidding/profiles/[cage] - create or replace (customer admins only)
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { cage } = await params;
  return backendProxy(request, `/bidding/profiles/${encodeURIComponent(cage)}`);
}

// DELETE /api/bidding/profiles/[cage] (customer admins only)
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { cage } = await params;
  return backendProxy(request, `/bidding/profiles/${encodeURIComponent(cage)}`);
}
