/**
 * Cookie / browser-storage consent — types shared between the React
 * context and the storage helpers.
 *
 * `necessary` is always true (we list it so /cookies can render a
 * consistent table) and the corresponding toggle in the UI is
 * disabled. `functional`, `analytics`, and `marketing` are the user's
 * actual choice.
 */

export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "marketing";

export interface ConsentChoice {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent {
  /**
   * Bumping this invalidates all stored consent and re-prompts every
   * visitor. Bump when the categories change or new cookies are
   * introduced that materially shift what consenting means.
   */
  version: number;
  choices: ConsentChoice;
  /** ISO 8601 timestamp the choice was recorded. */
  timestamp: string;
}

export const CONSENT_VERSION = 1;
export const CONSENT_COOKIE_NAME = "gph_cookie_consent";
/** 12 months in seconds. */
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
