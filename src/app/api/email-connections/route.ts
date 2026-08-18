import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET every email connection for the caller's company.
export async function GET(request: NextRequest) {
  return backendProxy(request, '/email-connections');
}

// POST a new connection. The plaintext credential passes through here once and
// is Fernet-encrypted by the backend before it touches the database.
export async function POST(request: NextRequest) {
  return backendProxy(request, '/email-connections');
}
