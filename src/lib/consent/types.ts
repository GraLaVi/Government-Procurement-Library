/**
 * Cookie / browser-storage consent — types shared between the React
 * context and the storage helpers.
 *
 * `necessary` is always true (we list it so /cookies can render a
 * consistent table) and the corresponding toggle in the UI is
 * disabled. `functional` and `analytics` are the optional categories.
 *
 * Analytics was removed in v2 and reinstated on 2026-08-19 for GA4
 * (see `src/components/tracking/GoogleAnalytics.tsx`). Marketing stays
 * out — we still set no advertising cookies.
 */

export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics";

export interface ConsentChoice {
  necessary: true;
  functional: boolean;
  /** Gates GA4. Opt-in only: unlike `functional`, this is never on
   *  pre-decision — GA4 stays unloaded until the visitor actively
   *  accepts. */
  analytics: boolean;
}

export interface StoredConsent {
  /**
   * Bumping this invalidates all stored consent and re-prompts every
   * visitor. Bump when the categories change or new cookies are
   * introduced that materially shift what consenting means.
   *
   * v2 (2026-05-11): dropped `analytics` and `marketing` categories.
   * v1 stored choices are invalidated by the version check.
   * v3 (2026-06-26): added the Atlassian Jira Service Management help
   * widget (functional). Re-prompts so visitors can decline the new
   * third-party cookie/iframe before it loads.
   * v4 (2026-08-19): reinstated the `analytics` category for GA4.
   * Re-prompts every visitor, which is the point — a v3 record was
   * written when the banner said we ran no analytics at all, so it
   * can't stand in for a decision about GA4 either way.
   */
  version: number;
  choices: ConsentChoice;
  /** ISO 8601 timestamp the choice was recorded. */
  timestamp: string;
}

export const CONSENT_VERSION = 4;
export const CONSENT_COOKIE_NAME = "gph_cookie_consent";
/** 12 months in seconds. */
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
