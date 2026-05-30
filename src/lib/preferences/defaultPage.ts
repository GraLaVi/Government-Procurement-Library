// Slug values stored in user_preferences.default_page and the paths they
// map to. Used by /account/preferences (write side) and the post-login
// redirect (read side) so the two stay in lockstep — a slug that exists
// here is one the visitor can pick and the login flow knows how to honor.
//
// Slugs are short, stable identifiers; renaming a route doesn't force a
// data migration as long as we update the path here.

export type DefaultPageSlug =
  | "dashboard"
  | "parts"
  | "vendor"
  | "bidmatching"
  | "account";

export const DEFAULT_PAGE_FALLBACK = "/dashboard";

export const DEFAULT_PAGE_OPTIONS: ReadonlyArray<{
  slug: DefaultPageSlug;
  label: string;
  description: string;
  path: string;
}> = [
  {
    slug: "dashboard",
    label: "Dashboard",
    description: "Overview, KPIs, and your getting-started checklist.",
    path: "/dashboard",
  },
  {
    slug: "parts",
    label: "Parts search",
    description: "Search the NSN parts library.",
    path: "/library/parts",
  },
  {
    slug: "vendor",
    label: "Vendor search",
    description: "Look up vendors by CAGE, UEI, or name.",
    path: "/library/vendor-search",
  },
  {
    slug: "bidmatching",
    label: "Bid matching",
    description: "Your matched solicitations.",
    path: "/bidmatching",
  },
  {
    slug: "account",
    label: "Account",
    description: "Account settings and team management.",
    path: "/account",
  },
];

export function resolveDefaultPagePath(
  slug: string | null | undefined,
): string {
  if (!slug) return DEFAULT_PAGE_FALLBACK;
  const match = DEFAULT_PAGE_OPTIONS.find((o) => o.slug === slug);
  return match?.path ?? DEFAULT_PAGE_FALLBACK;
}
