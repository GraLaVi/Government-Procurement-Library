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
