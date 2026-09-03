import { headers as requestHeaders } from 'next/headers';
import { NextRequest } from 'next/server';

/**
 * Extract the originating client IP from the incoming request.
 *
 * Priority: existing X-Forwarded-For (first hop), then X-Real-IP, then
 * Vercel/Cloudflare-specific headers. Falls back to the Next runtime's
 * request.ip (edge) when available.
 */
export function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return (request as unknown as { ip?: string }).ip ?? null;
}

/**
 * Build headers to forward to the backend audit-logged API so the FastAPI
 * `audit_context_middleware` records the real user IP, not the Next server IP.
 *
 * Adds:
 * - X-Forwarded-For: real client IP
 * - X-Real-IP: real client IP (backup)
 * - User-Agent: pass through browser UA
 */
export function buildForwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const ip = getClientIp(request);
  if (ip) {
    headers['X-Forwarded-For'] = ip;
    headers['X-Real-IP'] = ip;
  }
  const ua = request.headers.get('user-agent');
  if (ua) headers['User-Agent'] = ua;
  return headers;
}

/**
 * Same as `buildForwardHeaders`, but sources the incoming request from
 * `next/headers` instead of a `NextRequest` argument.
 *
 * This exists for the refresh path. `refreshSession` is reached from ~200 call
 * sites via `getAccessToken`/`refreshAccessToken`, neither of which is handed
 * the `NextRequest`, so there is no request object to thread down. Without
 * this, every token rotation wrote the Next server's own IP into
 * `customer_refresh_tokens.ip_address` — which is what the admin Access tab
 * reads, since it shows the newest row in each family. Sessions therefore
 * showed a real client IP only until their first rotation (one hour) and the
 * web server's IP forever after.
 *
 * Returns {} outside a request scope (build-time prerender, unit tests), where
 * `headers()` throws — the caller then behaves exactly as it did before.
 */
export async function buildForwardHeadersFromContext(): Promise<Record<string, string>> {
  try {
    const incoming = await requestHeaders();
    const out: Record<string, string> = {};
    const xff = incoming.get('x-forwarded-for');
    const ip = xff
      ? xff.split(',')[0].trim()
      : incoming.get('x-real-ip')?.trim()
        || incoming.get('cf-connecting-ip')?.trim()
        || null;
    if (ip) {
      out['X-Forwarded-For'] = ip;
      out['X-Real-IP'] = ip;
    }
    const ua = incoming.get('user-agent');
    if (ua) out['User-Agent'] = ua;
    return out;
  } catch {
    return {};
  }
}
