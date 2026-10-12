import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/reference/geo - US states and territories, Canadian provinces, countries
export async function GET(request: NextRequest) {
  return backendProxy(request, '/reference/geo');
}
