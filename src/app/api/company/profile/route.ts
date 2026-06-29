import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET the caller's merged company profile (demographics + contacts + certs).
export async function GET(request: NextRequest) {
  return backendProxy(request, '/company/profile');
}
