/**
 * Browser-side scratch storage for in-flight self-serve signup data.
 *
 * Option 2 flow: /signup collects CAGE + account details and stashes them
 * here. The visitor proceeds to /pricing, picks a plan, and only then
 * does Subscribe combine this blob + the picked price into a single call
 * to /api/billing/signup-and-checkout. Until that point, no DB writes
 * happen — abandoning the flow leaves zero residue on the server.
 *
 * Cleared by /account/billing once finalize-checkout has issued cookies.
 *
 * Writes are gated on functional-consent: visitors who decline functional
 * storage can still complete the signup flow within a single tab, but
 * navigating away loses the in-flight state.
 */

import { hasConsent } from "@/lib/consent/storage";

const STORAGE_KEY = "gph_pending_signup";

export type PendingSignup = {
  cage_code: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
};

export function readPendingSignup(): PendingSignup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSignup;
    // Sanity-check the shape — refuse partial blobs.
    if (
      !parsed?.cage_code ||
      !parsed?.email ||
      !parsed?.password ||
      !parsed?.first_name ||
      !parsed?.last_name
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingSignup(blob: PendingSignup): void {
  if (typeof window === "undefined") return;
  if (!hasConsent("functional")) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function clearPendingSignup(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
