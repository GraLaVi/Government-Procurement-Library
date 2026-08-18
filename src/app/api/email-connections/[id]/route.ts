import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PUT a partial update. Omitting `secret` keeps the stored credential.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}`);
}

// DELETE the connection entirely.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}`);
}
