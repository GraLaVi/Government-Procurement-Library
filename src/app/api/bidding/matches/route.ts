import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/bidding/matches - Bid on matches (?view=&started_by_user_id=&sol_status=&page=&page_size=&sort_by=&sort_dir=&search_field=&search=)
export async function GET(request: NextRequest) {
  return backendProxy(request, '/bidding/matches');
}
