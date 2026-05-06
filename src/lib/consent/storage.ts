/**
 * Read/write the consent cookie.
 *
 * The cookie itself is "strictly necessary" — we have to remember the
 * visitor's choice to honor it. SameSite=lax + path=/ + 12-month
 * max-age. Not httpOnly because the React app needs to read it
 * client-side; the value is only the user's own preference, no
 * sensitive identifier.
 *
 * Plain functions (no React) so storage call sites in non-component
 * modules — e.g. `src/lib/signup/pendingSignup.ts` — can gate writes
 * without depending on the React context.
 */

import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
  ConsentChoice,
  StoredConsent,
} from "./types";

export const DEFAULT_REJECTED: ConsentChoice = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const DEFAULT_ACCEPTED: ConsentChoice = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

export function readStoredConsent(): StoredConsent | null {
  if (!isBrowser()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split("=").slice(1).join("="));
    const parsed = JSON.parse(raw) as StoredConsent;
    // Guard: a stored choice from a prior policy version no longer
    // counts. Returning null re-prompts the visitor on next mount.
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.choices || typeof parsed.choices !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredConsent(choices: ConsentChoice): StoredConsent {
  const record: StoredConsent = {
    version: CONSENT_VERSION,
    choices: { ...choices, necessary: true },
    timestamp: new Date().toISOString(),
  };
  if (isBrowser()) {
    const value = encodeURIComponent(JSON.stringify(record));
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie =
      `${CONSENT_COOKIE_NAME}=${value}; ` +
      `Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  }
  return record;
}

export function clearStoredConsent(): void {
  if (!isBrowser()) return;
  document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/**
 * True only if the visitor has explicitly opted in to the named
 * category. Used by storage gates (theme, signup, waitlist) to decide
 * whether to write to localStorage / sessionStorage.
 *
 * Returns false when no choice has been made yet — the safe default.
 */
export function hasConsent(
  category: "functional" | "analytics" | "marketing",
): boolean {
  const stored = readStoredConsent();
  if (!stored) return false;
  return stored.choices[category] === true;
}
