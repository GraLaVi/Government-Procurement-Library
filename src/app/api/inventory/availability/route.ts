import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/inventory/availability - batch {part_ids} -> per-part stock badges
export async function POST(request: NextRequest) {
  return backendProxy(request, '/inventory/availability');
}
