import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET all certifications & set-asides.
export async function GET(request: NextRequest) {
  return backendProxy(request, '/company/certifications');
}

// POST a new certification / set-aside.
export async function POST(request: NextRequest) {
  return backendProxy(request, '/company/certifications');
}
