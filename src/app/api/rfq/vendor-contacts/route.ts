import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/vendor-contacts?cage_code= - list saved contacts
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/vendor-contacts');
}

// POST /api/rfq/vendor-contacts - create/save a contact
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/vendor-contacts');
}
