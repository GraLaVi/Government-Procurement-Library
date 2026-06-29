import { NextRequest } from 'next/server';
import { publicBackendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ token: string }>; }

// GET /api/rfq/public/[token] - view an RFQ via its emailed token (no auth)
export async function GET(request: NextRequest, { params }: Ctx) {
  const { token } = await params;
  return publicBackendProxy(request, `/rfq/public/${encodeURIComponent(token)}`);
}
