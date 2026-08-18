import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PUT — disable a connection, or re-arm a disabled one for testing.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}/status`);
}
