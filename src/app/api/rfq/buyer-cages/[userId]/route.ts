import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ userId: string }>; }

// PUT /api/rfq/buyer-cages/[userId] - replace a user's CAGE set (admin)
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { userId } = await params;
  return backendProxy(request, `/rfq/buyer-cages/${userId}`);
}
