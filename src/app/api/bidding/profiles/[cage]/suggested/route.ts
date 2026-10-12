import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ cage: string }>; }

// GET /api/bidding/profiles/[cage]/suggested - starting values for a new profile
export async function GET(request: NextRequest, { params }: Ctx) {
  const { cage } = await params;
  return backendProxy(request, `/bidding/profiles/${encodeURIComponent(cage)}/suggested`);
}
