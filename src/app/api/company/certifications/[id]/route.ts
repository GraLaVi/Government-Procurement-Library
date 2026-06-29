import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// PUT update a certification / set-aside.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/company/certifications/${encodeURIComponent(id)}`);
}

// DELETE a certification / set-aside.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/company/certifications/${encodeURIComponent(id)}`);
}
