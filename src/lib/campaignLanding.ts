import "server-only";

import { AUTH_CONFIG } from "@/lib/auth/config";

/**
 * Server-side record of a campaign landing.
 *
 * GA4 is the wrong instrument for this number and always will be: it loads
 * nothing until the visitor accepts the cookie banner, so every decliner and
 * everyone who ignores it is invisible — which is most of a cold campaign
 * audience. `/start/[slug]` renders per request, so the server already sees
 * the full URL with its `utm_*` before consent is even a question. Recording
 * it here is first-party, cookieless, and complete.
 *
 * Deliberately NOT a replacement for GA4: this counts landings and names the
 * campaign that produced them. What visitors then do on the site is still
 * GA4's job, for the subset who consent.
 */

/** Query keys worth keeping. Everything else on the URL is page state. */
const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

/** First value only — `?utm_source=a&utm_source=b` is a malformed link, not
 *  two campaigns, and the log should not invent a shape for it. */
function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim().slice(0, 128) : undefined;
}

/** Request facts the caller reads in request scope and hands over. They are
 *  passed in rather than read here because this runs inside `after()`, where
 *  request APIs like `headers()` are not reliably available. */
export interface LandingRequestInfo {
  referrer?: string;
  userAgent?: string;
}

/**
 * Report one landing. Never throws and never blocks the response — call it
 * from `after()` so the visitor's page is already on the wire. A campaign
 * page must render even when the API is down; a missing log row is a far
 * smaller problem than a failed landing.
 */
export async function recordCampaignLanding(
  slug: string,
  searchParams: SearchParams,
  request: LandingRequestInfo = {},
): Promise<void> {
  try {
    const body: Record<string, string | undefined> = { slug };
    for (const key of CAMPAIGN_KEYS) body[key] = first(searchParams[key]);
    body.interval = first(searchParams.interval)?.slice(0, 16);
    // The visitor's own referrer and agent. Their IP is deliberately not
    // collected or forwarded — campaign counts don't need it, and not
    // holding it keeps this out of personal-data territory entirely.
    body.referrer = request.referrer?.slice(0, 512);
    body.user_agent = request.userAgent?.slice(0, 256);

    // Shared secret, server-to-server. Read from a non-NEXT_PUBLIC_ variable
    // so it can never be inlined into a browser bundle. Absent locally, the
    // API answers 401 and the landing simply isn't counted — the page is
    // unaffected either way.
    const secret = process.env.INTERNAL_API_SECRET;
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/landing/campaign-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Internal-Secret": secret } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      // The page is already served by the time this runs; don't let a hung
      // API hold a serverless invocation open.
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      console.error(
        `[campaign] landing for "${slug}" not recorded: ${response.status}`,
      );
    }
  } catch (error) {
    console.error(`[campaign] landing for "${slug}" not recorded:`, error);
  }
}
