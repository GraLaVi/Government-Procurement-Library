import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST — make this the connection RFQ email is sent through (verified only).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}/default`);
}

// DELETE — keep the connection but revert sending to the platform identity.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}/default`);
}
