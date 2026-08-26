import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/library/vendor/[cageCode]/inventory - a vendor's shared stock.
// The backend 404s unless the vendor is a GPH customer who opted into
// vendor-search listing, so "no stock" and "not a customer" look the same
// from here. Deliberately NOT softened to an empty 200 the way /awards is:
// an empty payload would confirm the CAGE is a customer.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cageCode: string }> }
) {
  const { cageCode } = await params;
  return backendProxy(
    request,
    `/library/vendor/${encodeURIComponent(cageCode)}/inventory`
  );
}
