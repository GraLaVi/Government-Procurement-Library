import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/inventory/my-stock - batch {part_ids} -> caller's own stock lines
export async function POST(request: NextRequest) {
  return backendProxy(request, '/inventory/my-stock');
}
