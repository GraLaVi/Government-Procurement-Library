import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST /api/rfq/buyer-cages/pair - assign/unassign one (CAGE, buyer) pair.
// Literal route for the same reason as by-cage: the [userId] sibling is
// PUT-only.
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/buyer-cages/pair');
}
