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

export async function validateCageCode(raw: string): Promise<CageValidation> {
  const code = normalizeCage(raw);
  if (!code) {
    return { ok: false, error: "Enter your CAGE code to continue." };
  }
  try {
    const resp = await fetch("/api/billing/signup/validate-cage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cage_code: code }),
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
