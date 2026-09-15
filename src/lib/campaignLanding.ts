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
 * Deliberately NOT a replacement for GA4: this counts landings, names the
 * campaign that produced them, and records the one action the campaign page
 * asks for (the CAGE check). What visitors do elsewhere on the site is still
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

    await post("campaign-visit", body, `landing for "${slug}"`);
  } catch (error) {
    console.error(`[campaign] landing for "${slug}" not recorded:`, error);
  }
}

/** What the visitor's CAGE check came back with, as the page saw it. */
export interface EligibilityOutcome {
  /** null when the validator could not be reached — NOT the same as false. */
  eligible: boolean | null;
  reason?: string | null;
}

/**
 * Report one CAGE eligibility check run from a campaign page.
 *
 * The landing row says the ad delivered somebody; this one says they did the
 * single thing /start/<slug> asks of them. Called from the server side of the
 * validate-cage proxy rather than from the browser, so the write endpoint can
 * stay behind the shared secret and nobody can inflate the numbers by
 * replaying a request they watched in devtools.
 *
 * Same contract as recordCampaignLanding: never throws, never blocks. The
 * visitor's eligibility answer must not wait on our bookkeeping, so callers
 * hand this to `after()`.
 */
export async function recordCampaignEligibilityCheck(
  slug: string,
  cageCode: string,
  outcome: EligibilityOutcome,
  request: LandingRequestInfo = {},
): Promise<void> {
  try {
    await post(
      "campaign-eligibility-check",
      {
        slug,
        // Normalized here, not at the call site: the log is read by grouping
        // on this field, and "1evv6" and "1EVV6" are the same vendor.
        cage_code: cageCode.trim().toUpperCase().slice(0, 32),
        eligible: outcome.eligible,
        reason: outcome.reason?.slice(0, 256) ?? undefined,
        user_agent: request.userAgent?.slice(0, 256),
      },
      `eligibility check for "${slug}"`,
    );
  } catch (error) {
    console.error(`[campaign] eligibility check for "${slug}" not recorded:`, error);
  }
}

/**
 * POST one campaign event to the API's landing router.
 *
 * Shared secret, server-to-server. Read from a non-NEXT_PUBLIC_ variable so it
 * can never be inlined into a browser bundle. Absent locally, the API answers
 * 401 and the event simply isn't counted — the page is unaffected either way.
 */
async function post(
  path: string,
  body: Record<string, unknown>,
  description: string,
): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET;
  const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/landing/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Internal-Secret": secret } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    // The visitor already has their response by the time this runs; don't let
    // a hung API hold a serverless invocation open.
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    console.error(`[campaign] ${description} not recorded: ${response.status}`);
  }
}
