import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET the provider/product vocabulary that drives the add-connection form.
export async function GET(request: NextRequest) {
  return backendProxy(request, '/email-connections/options');
}
