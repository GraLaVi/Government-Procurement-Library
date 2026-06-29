import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PUT edits/hide for a contact (source_key = SAM contact_type or manual key).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return backendProxy(request, `/company/contacts/${encodeURIComponent(key)}`);
}

// DELETE a contact override (reverts SAM contact / removes a manual contact).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return backendProxy(request, `/company/contacts/${encodeURIComponent(key)}`);
}
