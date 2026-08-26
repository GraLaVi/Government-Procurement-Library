import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/inventory/listings/[id]/inquiry-click - the viewer opened a
// listing's "Email supplier" link. RFQ inquiries are recorded as
// rfq_recipients rows; a mailto: is invisible to the server, so without this
// suppliers who publish a direct email would report zero inquiries forever.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/inventory/listings/${encodeURIComponent(id)}/inquiry-click`, {
    forwardBody: false,
  });
}
