import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PUT demographic overrides (name, DBA, website, physical + mailing address, POC).
export async function PUT(request: NextRequest) {
  return backendProxy(request, '/company/overrides');
}
