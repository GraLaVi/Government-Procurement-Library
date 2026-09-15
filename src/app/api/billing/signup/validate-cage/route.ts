import { after, NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';
import { recordCampaignEligibilityCheck } from '@/lib/campaignLanding';
import { CAMPAIGN_SLUGS } from '@/lib/campaigns';

// POST /api/billing/signup/validate-cage — public, no auth.
// Body: { cage_code, campaign_slug? }
// Returns: { eligible, reason, prefill: { legal_business_name, dba_name } }
//
// `campaign_slug` is set only by the /start/<slug> pages and never forwarded
// upstream: it exists so the check can be logged against the campaign that
// prompted it. The logging happens HERE rather than in the browser because
// the API's write endpoint is behind a shared secret only the server holds —
// otherwise anyone could replay the call and invent engagement.
export async function POST(request: NextRequest) {
  // Hoisted so the catch below can still attribute the attempt: a visitor
  // whose check died on a connection error tried just as hard as one whose
  // check returned.
  let campaignSlug: string | undefined;
  let cageCode = '';
  try {
    const body = await request.json();
    const { campaign_slug: rawSlug, ...upstreamBody } = body ?? {};
    // Only slugs we actually publish. The registry check is what keeps a
    // hand-edited request from writing rows for campaigns that don't exist.
    campaignSlug =
      typeof rawSlug === 'string' && CAMPAIGN_SLUGS.includes(rawSlug) ? rawSlug : undefined;
    cageCode = typeof upstreamBody.cage_code === 'string' ? upstreamBody.cage_code : '';
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/signup/validate-cage`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await buildForwardHeadersFromContext()) },
      body: JSON.stringify(upstreamBody),
    });

    const data = await response.json();
    if (!response.ok) {
      // Still a visitor who tried. Logged with eligible: null — the validator
      // never answered, so recording a `false` here would quietly turn our
      // own outage into a page full of ineligible vendors.
      if (campaignSlug) {
        const slug = campaignSlug;
        after(() =>
          recordCampaignEligibilityCheck(
            slug,
            cageCode,
            { eligible: null, reason: `validator_error_${response.status}` },
            { userAgent },
          ),
        );
      }
      return NextResponse.json(
        { error: data.detail || 'CAGE validation failed' },
        { status: response.status },
      );
    }
    if (campaignSlug) {
      const slug = campaignSlug;
      after(() =>
        recordCampaignEligibilityCheck(
          slug,
          cageCode,
          { eligible: data.eligible === true, reason: data.reason },
          { userAgent },
        ),
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Validate CAGE error:', err);
    if (campaignSlug) {
      const slug = campaignSlug;
      after(() =>
        recordCampaignEligibilityCheck(
          slug,
          cageCode,
          { eligible: null, reason: 'validator_unreachable' },
          { userAgent: request.headers.get('user-agent') ?? undefined },
        ),
      );
    }
    // Network / connection failure (e.g. backend down, ECONNREFUSED). Surface
    // as 503 so the UI can distinguish "couldn't reach the validator" from
    // a real "this CAGE is not eligible" response.
    return NextResponse.json(
      { error: 'Unable to reach the eligibility service. Please try again in a moment.' },
      { status: 503 },
    );
  }
}
