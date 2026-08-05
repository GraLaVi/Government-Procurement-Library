import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/rfq/worklist?scope=&work_status=&page= - Send RFQs work queue
export async function GET(request: NextRequest) {
  return backendProxy(request, '/rfq/worklist');
}
