import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/vendor-contact?cage_code= - saved contacts + SAM suggestion
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/vendor-contact');
}
