/**
 * Cookie / browser-storage consent — types shared between the React
 * context and the storage helpers.
 *
 * `necessary` is always true (we list it so /cookies can render a
 * consistent table) and the corresponding toggle in the UI is
 * disabled. `functional` is the only currently-offered optional
 * category. Analytics and marketing categories were removed in v2
 * because we have no plans to add either anytime soon — they'll come
 * back as a version bump if/when that changes.
 */

export type ConsentCategory =
  | "necessary"
  | "functional";

export interface ConsentChoice {
  necessary: true;
  functional: boolean;
}

export interface StoredConsent {
  /**
   * Bumping this invalidates all stored consent and re-prompts every
   * visitor. Bump when the categories change or new cookies are
   * introduced that materially shift what consenting means.
   *
   * v2 (2026-05-11): dropped `analytics` and `marketing` categories.
   * v1 stored choices are invalidated by the version check.
   */
  version: number;
  choices: ConsentChoice;
  /** ISO 8601 timestamp the choice was recorded. */
  timestamp: string;
}

export const CONSENT_VERSION = 2;
export const CONSENT_COOKIE_NAME = "gph_cookie_consent";
/** 12 months in seconds. */
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
