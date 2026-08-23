import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/library/parts/[nsn]/inventory - Supplier Stock (my_stock + projected network_stock)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nsn: string }> }
) {
  const { nsn } = await params;
  return backendProxy(request, `/library/parts/${encodeURIComponent(nsn)}/inventory`);
}
