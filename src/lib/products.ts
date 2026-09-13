/**
 * The product pages under /products, in the order they are presented.
 *
 * One list, read by the /products index and by the Navbar's Products dropdown,
 * so a product cannot appear in the menu before its page exists. `href: null`
 * means the page is not written yet: it still shows up as a card and a menu
 * entry, greyed and unclickable, rather than silently disappearing — the five
 * products are the pitch whether or not each has a page behind it.
 */
export interface ProductPage {
  slug: "bid-matching" | "rfq" | "library" | "supplier-stock" | "analytics";
  name: string;
  /** Menu-length summary. One line, no trailing period in the nav. */
  blurb: string;
  href: string | null;
}

export const PRODUCT_PAGES: ProductPage[] = [
  {
    slug: "bid-matching",
    name: "Bid-Matching",
    blurb:
      "Describe what you sell once, and every new DIBBS and SAM.gov solicitation gets read against it daily — with the reason attached to each match.",
    href: "/products/bid-matching",
  },
  {
    slug: "library",
    name: "Parts & Vendor Library",
    blurb:
      "Look up any NSN or CAGE: identifiers, manufacturers, technical characteristics, award history, and who is competing on it.",
    href: "/products/library",
  },
  {
    slug: "rfq",
    name: "Requests for Quote",
    blurb:
      "Send structured RFQs to your vendors and track every response, with a shared batch cart and a private contact book.",
    href: "/products/rfq",
  },
  {
    slug: "supplier-stock",
    name: "Supplier Stock",
    blurb:
      "Upload what you have on the shelf, free. It shows on every part you research and in your RFQ queue — and shared stock opens the network's.",
    href: "/products/supplier-stock",
  },
  {
    slug: "analytics",
    name: "Procurement Analytics",
    blurb:
      "Your win rate, your competitors, the markets worth getting qualified in, and what DLA is about to need.",
    href: "/products/analytics",
  },
];
