import { NextRequest } from 'next/server';
import { publicBackendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ token: string }>; }

// POST /api/rfq/public/[token]/respond - submit a quote (no auth)
export async function POST(request: NextRequest, { params }: Ctx) {
  const { token } = await params;
  return publicBackendProxy(request, `/rfq/public/${encodeURIComponent(token)}/respond`);
}
