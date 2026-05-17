# Landing page copy — for review

> **How to revise this document**
>
> - Edit any text below in place. Use bold (`**foo**`) and italic (`*foo*`) sparingly if you want to suggest emphasis.
> - **Don't rename the section headings** (`## Hero`, `### Highlights`, etc.) — those anchor each chunk to a source file. Renaming makes it harder for us to merge your edits back.
> - The lines that look like `<!-- src: components/landing/Hero.tsx:30-33 -->` are HTML comments. They show where the chunk lives in code so we can find it on re-import. They won't appear in the rendered website. Leave them alone.
> - Use `[note: …]` brackets if you want to flag something for us instead of editing — e.g. `[note: should this say "vendors" instead of "contractors"?]`.
> - Things to flag if you're unsure: capitalization on proper nouns (DoD, DLA, DIBBS, NSN/NIIN, CAGE, DoDAAC, RFQ/RFP), inline em-dashes vs. hyphens, ampersand vs. "and".

---

## Beta Banner
<!-- src: components/landing/BetaBanner.tsx — site-wide top strip on the landing page -->

**Pill (always visible):** Beta
**Message (desktop, ≥ sm breakpoint):** GPH is now in private beta with select defense contractors.
**Message (mobile, < sm breakpoint):** Now in private beta.
**Call-to-action link:** Request access →

---

## Hero
<!-- src: components/landing/Hero.tsx -->

### Eyebrow pill
<!-- src: components/landing/Hero.tsx:25-28 -->

Private beta · applications open

### Headline
<!-- src: components/landing/Hero.tsx:30-33 -->

Win More DoD Bids

> *Note: "DoD Bids" renders in the primary brand color (highlighted within the headline). If you want a different word to be the highlight, indicate which word(s) in brackets.*

### Subhead
<!-- src: components/landing/Hero.tsx:34-39 -->

GPH is your DoD Procurement Platform. Search DLA and DIBBS opportunities, track military branch RFQs, and match your CAGE-coded capabilities to active contracts — before your competitors do.

### Highlights (bulleted list, three items)
<!-- src: components/landing/Hero.tsx:4-8 -->

- Live DLA and DIBBS solicitation feeds updated daily
- NSN/NIIN part search with cross-referenced CAGE codes
- Automated bid-matching against your saved profiles

### Call-to-action buttons
<!-- src: components/landing/Hero.tsx:54-61 -->

**Primary button:** Request Beta Access
**Secondary button:** View Pricing

### Trust line (small text below buttons)
<!-- src: components/landing/Hero.tsx:64-67 -->

Beta access is reviewed and approved before activation. No credit card required to apply.

### Dashboard preview (mock card to the right of the copy)
<!-- src: components/landing/Hero.tsx:74-114 -->

**Card heading:** Today's DoD Matches
**Badge:** 8 New
**Sample row 1 — title:** DLA SPE4A6-25-R-0142
**Sample row 1 — agency:** Defense Logistics Agency
**Sample row 1 — value:** $1.8M
**Sample row 2 — title:** DIBBS RFQ - NSN 5305-01-587-2318
**Sample row 2 — agency:** DLA Aviation
**Sample row 2 — value:** $420K
**Sample row 3 — title:** Repair Parts - TACOM
**Sample row 3 — agency:** U.S. Army
**Sample row 3 — value:** $2.1M
**Card footer link:** View all 23 DoD solicitations →

### Floating stat (bottom-left of the dashboard preview)
<!-- src: components/landing/Hero.tsx:111-113 -->

**Stat number:** $4.2B+
**Stat label:** DoD Solicitations Tracked

---

## Products
<!-- src: components/landing/Products.tsx -->

### Section header
<!-- src: components/landing/Products.tsx:86-93 -->

**Heading:** Four products. Pick what fits.
**Subhead:** Subscribe to one, mix-and-match, or bundle. Bid Matching is included free with any active subscription — upgrade to Advanced for unlimited use.

### Product 1 — Parts & Vendor Library / Free
<!-- src: components/landing/Products.tsx:16-29 -->

**Family:** Parts & Vendor Library
**Tier badge:** Free
**Tagline:** Start with the essentials, no card required.
**Description:** Look up parts and vendors right after signup — no commitment. See recent-solicitation activity per part and basic vendor demographics.
**Feature bullets:**
- Parts overview + recent-solicitation count
- Vendor demographics lookup
- Bid matching: 1 profile (NIIN or NSN)
- 1 user

### Product 2 — Parts & Vendor Library / Basic
<!-- src: components/landing/Products.tsx:30-44 -->

**Family:** Parts & Vendor Library
**Tier badge:** Basic
**Tagline:** Get the lay of the land.
**Description:** Combined parts + vendor library with the essentials: search, summary, code definitions, and award history.
**Feature bullets:**
- Parts + Vendor search
- Awards history
- Code definitions
- Bid Matching Basic included (5 profiles)
- Per-seat pricing

### Product 3 — Parts & Vendor Library / Advanced  (marked "Most popular")
<!-- src: components/landing/Products.tsx:45-60 -->

**Family:** Parts & Vendor Library
**Tier badge:** Advanced
**Highlight ribbon:** Most popular
**Tagline:** The complete procurement picture.
**Description:** Everything in Basic plus procurement history, manufacturers, packaging, bookings, technical characteristics, end-use, and live solicitations.
**Feature bullets:**
- Everything in Basic
- Procurement history & bookings
- Manufacturers & packaging
- Active solicitations feed
- Bid Matching Basic included (15 profiles)

### Product 4 — Data Reports / Quote
<!-- src: components/landing/Products.tsx:61-77 -->

**Family:** Data Reports
**Tier badge:** Quote
**Tagline:** Bespoke procurement intelligence, scoped to your need.
**Description:** Tell us what you need — sourcing analysis, vendor scorecards, contract intelligence, or a one-off pull from our data. We scope, price, and deliver.
**Feature bullets:**
- One-time deliverables or recurring cadence
- Custom data extracts
- Engagement-scoped pricing
**Call-to-action link:** Contact sales →

### Card CTA (shown on all subscription products)
<!-- src: components/landing/Products.tsx:152-158 -->

See pricing →

### Section footer
<!-- src: components/landing/Products.tsx:165-171 -->

Pricing varies by billing period and seat count. Visit *the pricing page* for current numbers.

---

## Features
<!-- src: components/landing/Features.tsx -->

### Section header
<!-- src: components/landing/Features.tsx:54-61 -->

**Heading:** Everything You Need to Win DoD Bids
**Subhead:** Purpose-built tools for defense contractors working with DLA, DIBBS, and military service branches

### Feature 1
<!-- src: components/landing/Features.tsx:11-16 -->

**Title:** DLA Solicitation Matching
**Description:** Automatically scan and match DLA solicitations from DIBBS and other DoD procurement channels to your company's capabilities, CAGE code, and past performance.

### Feature 2
<!-- src: components/landing/Features.tsx:17-22 -->

**Title:** Real-Time DoD Alerts
**Description:** Get instant notifications when new RFQs, RFPs, and solicitations are posted by DLA, Army, Navy, Air Force, and Marine Corps contracting offices.

### Feature 3
<!-- src: components/landing/Features.tsx:23-28 -->

**Title:** NSN/NIIN Parts Database
**Description:** Search millions of National Stock Numbers and NIINs with complete part data, cross-references, management codes, and linked solicitation history.

### Feature 4
<!-- src: components/landing/Features.tsx:29-34 -->

**Title:** CAGE Code Intelligence
**Description:** Look up any CAGE or DoDAAC code to see associated contracts, award history, and active solicitations. Understand who is competing and winning.

### Feature 5
<!-- src: components/landing/Features.tsx:35-40 -->

**Title:** Competitor Analysis
**Description:** Track which contractors are winning DoD awards in your space. See their CAGE codes, contract values, and bidding patterns across DLA and service branches.

### Feature 6
<!-- src: components/landing/Features.tsx:41-46 -->

**Title:** DIBBS & Solicitation Search
**Description:** Search and filter DIBBS solicitations, packaging requirements, and qualification criteria so you can respond to DoD opportunities faster and more accurately.

---

## How It Works
<!-- src: components/landing/HowItWorks.tsx -->

### Section header
<!-- src: components/landing/HowItWorks.tsx:29-36 -->

**Heading:** How GPH Works
**Subhead:** From beta application to your first matched contract

### Step 01
<!-- src: components/landing/HowItWorks.tsx:4-9 -->

**Title:** Request Beta Access
**Description:** Sign up with your work email. Beta seats are reviewed and approved by the GPH team — no credit card needed to apply.

### Step 02
<!-- src: components/landing/HowItWorks.tsx:10-15 -->

**Title:** Pick a Plan & Set Your Profile
**Description:** Once approved, subscribe to ALAN Library Basic, Full, or Bid Matching Advanced. Configure your CAGE code, NSN categories, and bid-matching profiles.

> *Note: tier names here ("ALAN Library Basic, Full, Bid Matching Advanced") don't match the current branding in the Products section ("Parts & Vendor Library — Free / Basic / Advanced"). Flag whether to align step 2 to current names or rewrite altogether.*

### Step 03
<!-- src: components/landing/HowItWorks.tsx:16-21 -->

**Title:** Win DoD Contracts
**Description:** Receive matched solicitations daily, analyze competitor activity with CAGE-code intelligence, and submit stronger proposals backed by real procurement data.

---

## Final Call-to-Action (CTA)
<!-- src: components/landing/CTA.tsx -->

### Eyebrow pill
<!-- src: components/landing/CTA.tsx:16-19 -->

Beta seats available

### Heading
<!-- src: components/landing/CTA.tsx:20-22 -->

Ready to Win More DoD Bids?

### Body
<!-- src: components/landing/CTA.tsx:23-27 -->

Apply for a beta seat to get hands-on with live DLA solicitation feeds, NSN/NIIN search, and bid matching. Pick a plan when you're ready — your team is approved before any charge.

### Buttons
<!-- src: components/landing/CTA.tsx:29-46 -->

**Primary button:** Request Beta Access
**Secondary button:** View Pricing

### Stat card 1
<!-- src: components/landing/CTA.tsx:51-55 -->

**Stat number:** 15K+
**Stat label:** DoD Solicitations Indexed Monthly

### Stat card 2
<!-- src: components/landing/CTA.tsx:56-60 -->

**Stat number:** $4.2B+
**Stat label:** DoD Contract Value Tracked

### Coverage list
<!-- src: components/landing/CTA.tsx:61-71 -->

**Lead-in:** Covering solicitations from:
**Branches (rendered as flat tags):** DLA, Army, Navy, Air Force, Marines, Space Force
