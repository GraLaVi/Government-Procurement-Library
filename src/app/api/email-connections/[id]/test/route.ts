import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// POST — queue the worker's verification. The outcome lands on the connection
// row, so the page polls the list rather than the task result.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/email-connections/${encodeURIComponent(id)}/test`);
}
