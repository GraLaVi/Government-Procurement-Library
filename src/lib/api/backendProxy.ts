import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

/**
 * Proxy a request to a PUBLIC (token-authorized) backend endpoint WITHOUT
 * attaching any customer JWT. Used for the responder flow where the URL token
 * is the only credential.
 */
export async function publicBackendProxy(
  request: NextRequest,
  backendPath: string,
  opts: { method?: string; forwardBody?: boolean } = {},
): Promise<NextResponse> {
  const method = (opts.method || request.method).toUpperCase();
  const forwardBody = opts.forwardBody ?? !['GET', 'HEAD', 'DELETE'].includes(method);
  const url = `${AUTH_CONFIG.API_BASE_URL}${backendPath}`;
  try {
    const body = forwardBody ? await request.text() : undefined;
    const response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error
        || 'Request failed';
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(`RFQ public proxy error (${method} ${backendPath}):`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

interface ProxyOptions {
  /** HTTP method to send to the backend. Defaults to the incoming request's method. */
  method?: string;
  /** Forward the incoming request body (JSON). Defaults to true for write methods. */
  forwardBody?: boolean;
  /** Append the incoming query string to the backend path. Defaults to true. */
  forwardQuery?: boolean;
}

/**
 * Proxy a request to the FastAPI backend, attaching the customer JWT and
 * transparently refreshing it on a 401. Mirrors the hand-written bid-matching
 * proxies but collapses the boilerplate so each RFQ route is one line.
 */
export async function backendProxy(
  request: NextRequest,
  backendPath: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const method = (opts.method || request.method).toUpperCase();
  const forwardBody = opts.forwardBody ?? !['GET', 'HEAD', 'DELETE'].includes(method);
  const forwardQuery = opts.forwardQuery ?? true;

  const search = forwardQuery ? request.nextUrl.search : '';
  const url = `${AUTH_CONFIG.API_BASE_URL}${backendPath}${search}`;

  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Read the body once so we can replay it on the refresh retry.
    const body = forwardBody ? await request.text() : undefined;

    const doFetch = (bearer: string) =>
      fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${bearer}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body,
      });

    let response = await doFetch(token);

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
      response = await doFetch(newToken);
    }

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error
        || 'Request failed';
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(`RFQ proxy error (${method} ${backendPath}):`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
