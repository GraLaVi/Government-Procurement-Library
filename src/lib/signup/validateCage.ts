// Shared CAGE eligibility check for the self-serve signup funnel.
//
// Both entry points — /signup step 1 and the /start/<slug> campaign pages —
// hit the same endpoint and have to tell the same three outcomes apart
// (eligible, not eligible, couldn't reach the validator). Keeping the call
// and its error mapping here means the two can't drift into disagreeing
// about what a 503 means.

export type CageValidateResponse = {
  eligible: boolean;
  reason: string | null;
  prefill: {
    legal_business_name: string | null;
    dba_name: string | null;
  } | null;
};

export type CageValidation =
  | { ok: true; data: CageValidateResponse }
  | { ok: false; error: string };

/** Normalize whatever the visitor typed into the form the API expects. */
export function normalizeCage(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * @param campaignSlug Set by the /start/<slug> pages only. The route logs the
 *   check against that campaign — it is the page's one call to action, so it
 *   is the only engagement signal the campaign produces before signup. It is
 *   stripped server-side and never reaches the validator, so passing it can't
 *   change the eligibility answer. /signup's own step-1 check omits it: that
 *   check belongs to no campaign.
 */
export async function validateCageCode(
  raw: string,
  campaignSlug?: string,
): Promise<CageValidation> {
  const code = normalizeCage(raw);
  if (!code) {
    return { ok: false, error: "Enter your CAGE code to continue." };
  }
  try {
    const resp = await fetch("/api/billing/signup/validate-cage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cage_code: code, campaign_slug: campaignSlug }),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return {
        ok: false,
        error:
          errBody.error ||
          (resp.status >= 500
            ? "We couldn't reach the eligibility service. Please try again."
            : "Validation failed."),
      };
    }
    return { ok: true, data: (await resp.json()) as CageValidateResponse };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
