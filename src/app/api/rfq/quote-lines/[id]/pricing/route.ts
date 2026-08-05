import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ id: string }>; }

// PATCH /api/rfq/quote-lines/[id]/pricing - buyer cost build-up (markup,
// shipping, other charges -> price to government). All-null clears.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return backendProxy(request, `/rfq/quote-lines/${id}/pricing`);
}
