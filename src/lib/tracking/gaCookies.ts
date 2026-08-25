/**
 * Remove the cookies GA4 left on the visitor's device.
 *
 * Declining analytics stops us sending events, but the `_ga` cookies set
 * before that choice would otherwise sit there until they expire (two
 * years). On campaign landing pages measurement now starts before the
 * banner is answered, so a decline genuinely has something to clean up —
 * without this, "Reject non-essential" would silently leave the identifier
 * that made the visitor recognisable in the first place.
 */

/** GA4 sets `_ga` plus one `_ga_<STREAM>` per property. Matched by prefix
 *  so a second data stream is covered without a code change. */
const GA_COOKIE_PREFIX = "_ga";

/**
 * Every domain a cookie on this host could have been scoped to, broadest
 * last: host-only, then each parent domain up to (but not including) the
 * public suffix. `www.gphusa.com` yields `.www.gphusa.com` and
 * `.gphusa.com` — we cannot read which one GA used (the Cookie header
 * doesn't carry it), so a delete has to be attempted against each.
 */
function domainCandidates(hostname: string): Array<string | undefined> {
  const parts = hostname.split(".");
  // undefined = no domain attribute at all, which targets the host-only
  // cookie. Deleting requires matching how the cookie was written.
  const candidates: Array<string | undefined> = [undefined];
  for (let i = 0; i < parts.length - 1; i += 1) {
    candidates.push(`.${parts.slice(i).join(".")}`);
  }
  return candidates;
}

/** Expire every `_ga*` cookie readable on this document. Safe to call
 *  repeatedly and when there is nothing to remove. */
export function clearGaCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name): name is string => !!name && name.startsWith(GA_COOKIE_PREFIX));
  if (names.length === 0) return;

  const domains = domainCandidates(window.location.hostname);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secure}` +
        (domain ? `; domain=${domain}` : "");
    }
  }
}
