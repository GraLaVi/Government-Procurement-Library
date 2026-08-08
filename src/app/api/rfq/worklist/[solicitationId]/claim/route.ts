import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

interface Ctx { params: Promise<{ solicitationId: string }>; }

// POST /api/rfq/worklist/[solicitationId]/claim - race-safe self-assignment
export async function POST(request: NextRequest, { params }: Ctx) {
  const { solicitationId } = await params;
  return backendProxy(request, `/rfq/worklist/${solicitationId}/claim`);
}
