# Help Center (`/help`)

The Help Center is the user-facing documentation site built from the GPH help
doc set. This document is the maintainer's guide: what exists, where it lives,
and how to add or change articles.

## What it is

- A landing/hub page at **`/help`** that routes to every article.
- Individual article pages at **`/help/<slug>`** (11 articles, statically
  generated).
- Content authored as markdown in `src/content/help/`, rendered with the same
  `react-markdown` + Tailwind `prose` stack used by the legal pages.
- **Public.** `/help` is in `AUTH_CONFIG.ROUTES.PUBLIC`
  (`src/lib/auth/config.ts`), which the prefix match extends to every
  `/help/<slug>`. Signed-out visitors get the marketing `<Navbar />`; signed-in
  users get the in-app `<Header />`. Keep it that way — the articles are
  marketing surface as much as support material, and `/support` and
  `/documentation` (both public) link straight into it.

Source content originated from the GPH help doc set (`docs/gph_documentation/`,
authored in Google Docs). Those raw `.md` files are the upstream source; the
files under `src/content/help/` are the normalized, deployed copies.

## File map

| Path | Role |
|---|---|
| `src/lib/help.ts` | **Single source of truth** — ordered registry of articles (slug, title, blurb, group, hub/spoke). Drives both the route allowlist and the landing-page layout. |
| `src/content/help/<slug>.md` | Article content + YAML frontmatter (`title`, `meta_title`, `description`, optional `last_updated`). |
| `src/app/help/page.tsx` | Server component for the landing page; exports SEO `metadata`. |
| `src/app/help/HelpLanding.tsx` | Client landing page: featured "Start here" card, grouped article lists, "Can't find…?" → FAQ + contact. |
| `src/app/help/[slug]/page.tsx` | Server route: loads the markdown, `generateStaticParams` (SSG) + `generateMetadata`. |
| `src/app/help/[slug]/HelpArticle.tsx` | Client renderer: markdown → prose, breadcrumb, heading anchors, internal-link routing. |

## Articles & URLs

| Slug | Title | Group |
|---|---|---|
| `getting-started` | Getting Started | Start here (featured) |
| `bid-matching-profiles` | Setting Up Bid-Matching Profiles | Using the platform |
| `bid-matching-recipes` | Bid-Matching Recipes and Tuning | Using the platform (spoke of profiles) |
| `solicitation-matching` | How Solicitation Matching Works | Using the platform |
| `parts-search` | Searching for Parts | Using the platform |
| `vendor-research` | Researching Vendors | Using the platform |
| `solicitations-and-contracts` | Viewing Solicitations and Contracts | Using the platform |
| `plans-and-pricing` | Plans and Pricing | Plans, billing, and account |
| `account-settings` | Managing Your Account | Plans, billing, and account |
| `notifications` | Notifications | Plans, billing, and account |
| `faq` | Frequently Asked Questions | Reached via "Can't find…?" |

`/help/billing` is intentionally **not built** — reserved for the Stripe UI
overhaul.

## How to add or edit an article

1. Add `src/content/help/<slug>.md` with frontmatter:
   ```yaml
   ---
   title: "On-page H1"
   meta_title: "SEO <title> | GPH Help"
   description: "Meta description for search results."
   last_updated: "2026-06-22"   # optional; renders "Last updated" if present
   ---
   ```
2. Add a matching entry to `HELP_ARTICLES` in `src/lib/help.ts` (slug, title,
   blurb, `group`, optional `spokeOf`).
3. That's it — the `[slug]` route allowlist, SSG params, and landing-page card
   all derive from the registry. To retire an article, remove both the `.md`
   and the registry entry.

### Conventions baked into the renderer

- **Internal links** (`/help/...`, `/contact`, etc.) route through `next/link`
  for client-side nav; external links open in a new tab. Write internal links
  root-relative.
- **Heading anchors**: `h2`–`h4` get GitHub-style `id`s via slugify, so
  in-article anchors like `/help/bid-matching-profiles#condition-types` resolve.
- **No top-level `#` H1** in article bodies — the page renders the H1 from
  frontmatter `title`. Start body headings at `##`.
- **No images** in the current set; the renderer has no image styling beyond
  `prose` defaults.

## Navigation & entry points

- **Footer** → "Documentation" links to `/help` (`src/components/layout/Footer.tsx`).
- **Help dropdown** → "Help Center" is the first item, in both
  `src/components/layout/Navbar.tsx` (marketing nav) and
  `src/components/layout/Header.tsx` (in-app nav), desktop + mobile. The Navbar
  dropdown renders for everyone; its "Code Definitions" entry is filtered out
  for signed-out visitors because that page is still auth-gated.
- **`/documentation`** (old placeholder) now redirects to `/help` so existing
  inbound links don't 404.
- **`/support`** is a real page linking the Help Center, FAQ, and contact.

## Known gaps / deferred

- No `last_updated` dates yet — the source docs carried none; add per-file when
  known.
- Deferred per the documentation epic: `/help/billing`, the bid-matching
  glossary fold-in (NIIN/NSN/FSC/CAGE/etc.), FAQ expansion beyond the seeded
  bid-matching questions, and the Competitive Intelligence Playbook.
