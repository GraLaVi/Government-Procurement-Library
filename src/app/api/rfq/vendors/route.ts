import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/vendors - the customer's private vendor book (contacts nested)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/vendors');
}

// POST /api/rfq/vendors - create a private vendor
export async function POST(request: NextRequest) {
  return backendProxy(request, '/rfq/vendors');
}
