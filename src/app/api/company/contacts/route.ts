import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET the merged public contact list.
export async function GET(request: NextRequest) {
  return backendProxy(request, '/company/contacts');
}

// POST a brand-new manual contact.
export async function POST(request: NextRequest) {
  return backendProxy(request, '/company/contacts');
}
