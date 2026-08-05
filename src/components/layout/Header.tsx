"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { resolveLibraryTier } from "@/lib/library/tier";

const librarySearchItems = [
  { href: "/library/parts", label: "Parts Search" },
  { href: "/library/vendor-search", label: "Vendor Search" },
];

const helpItems = [
  { href: "/help", label: "Help Center" },
  { href: "/library/code-definitions", label: "Code Definitions" },
  {
    href: "https://gphusa.atlassian.net/servicedesk/customer/portals",
    label: "Contact support →",
    external: true,
  },
];

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bidmatching", label: "Bid-Matching" },
];

const baseRfqItems = [
  { href: "/rfq", label: "My RFQs" },
  { href: "/rfq/batch", label: "Batch" },
  { href: "/rfq/contacts", label: "Vendor Contacts" },
  { href: "/rfq/settings", label: "Settings" },
  { href: "/rfq/received", label: "Received RFQs" },
];

// Enterprise-only entries, spliced in ahead of the base items for holders of
// request_for_quote_enterprise (the work queue is their primary surface).
const enterpriseRfqItems = [
  { href: "/rfq/worklist", label: "Send RFQs" },
  { href: "/rfq/vendors", label: "Private Vendors" },
  { href: "/rfq/coverage", label: "Coverage" },
  // Admin page, but listed for every Enterprise holder — non-admins get the
  // page's own read-only "admins only" notice rather than a hidden feature.
  { href: "/account/rfq-assignments", label: "Buyer Assignments" },
];

// Match the current path against a nav target. Exact match or sub-path
// (so /library/parts/123 still highlights the /library/parts entry).
function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// A dropdown trigger is active when any of its child items match.
function isGroupActive(items: { href: string }[], pathname: string): boolean {
  return items.some((it) => isLinkActive(it.href, pathname));
}

// Within a dropdown, the most specific matching sibling wins. Needed for the
// RFQ group, where "/rfq" (My RFQs) is a path parent of every other entry —
// plain prefix matching would highlight it on /rfq/batch, /rfq/received, etc.
function isGroupItemActive(item: { href: string }, items: { href: string }[], pathname: string): boolean {
  if (!isLinkActive(item.href, pathname)) return false;
  return !items.some(
    (s) => s.href !== item.href && s.href.length > item.href.length && isLinkActive(s.href, pathname)
  );
}

interface HeaderProps {
  /** Show the Account link with avatar (default: true). Set to false on main account page. */
  showAccountLink?: boolean;
}

export function Header({ showAccountLink = true }: HeaderProps) {
  const { user, logout, isRfqResponderOnly, hasAnyProductAccess } = useAuth();
  // Analytics is Maximum-tier only — see /analytics's own gate, which uses
  // the same resolveLibraryTier() helper.
  const isMaximumTier = resolveLibraryTier(hasAnyProductAccess) === "maximum";
  // Enterprise RFQ entries (work queue, private vendors) only for holders —
  // unlike the base RFQ menu, these are not an upsell surface.
  const rfqItems = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY])
    ? [...enterpriseRfqItems, ...baseRfqItems]
    : baseRfqItems;
  const [isLibraryDropdownOpen, setIsLibraryDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [isRfqDropdownOpen, setIsRfqDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [isMobileHelpOpen, setIsMobileHelpOpen] = useState(false);
  const [isMobileRfqOpen, setIsMobileRfqOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);
  const rfqDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";

  const libraryGroupActive = isGroupActive(librarySearchItems, pathname);
  const helpGroupActive = isGroupActive(helpItems, pathname);
  const rfqGroupActive = isGroupActive(rfqItems, pathname);

  // Class builders. Idle styling matches the existing nav; active state
  // applies the primary color (and a soft tinted background on dropdown
  // items / mobile rows where there's room for it).
  const topLinkClass = (active: boolean) =>
    `transition-colors ${
      active
        ? "text-primary font-semibold"
        : "text-card-foreground hover:text-foreground"
    }`;
  const dropdownItemClass = (active: boolean) =>
    `block px-4 py-2 text-sm transition-colors ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-card-foreground hover:text-foreground hover:bg-muted-light"
    }`;
  const mobileRowClass = (active: boolean) =>
    `px-4 py-3 rounded-lg transition-colors ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-card-foreground hover:text-foreground hover:bg-muted-light"
    }`;
  const mobileDropdownItemClass = (active: boolean) =>
    `block px-4 py-2 text-sm rounded-lg transition-colors ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-card-foreground hover:text-foreground hover:bg-muted-light"
    }`;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLibraryDropdownOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setIsHelpDropdownOpen(false);
      }
      if (rfqDropdownRef.current && !rfqDropdownRef.current.contains(event.target as Node)) {
        setIsRfqDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change (when clicking a link)
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileLibraryOpen(false);
    setIsMobileHelpOpen(false);
    setIsMobileRfqOpen(false);
  };

  const userInitial = user?.first_name?.[0] || user?.email?.[0] || "U";

  return (
    <>
    <header className="bg-card-bg border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — nav-lockup: teal vertical bar + GPH wordmark.
              See docs/plans/branding_guidelines.md. */}
          <Link href="/" className="nav-lockup" aria-label="GPH home">
            <span className="wordmark text-xl text-card-foreground">GPH</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted-light transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop Nav Links + User menu (right-justified) */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              {!isRfqResponderOnly && (
              <Link
                href="/dashboard"
                className={topLinkClass(isLinkActive("/dashboard", pathname))}
              >
                Dashboard
              </Link>
              )}
              {/* Library Search Dropdown */}
              {!isRfqResponderOnly && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsLibraryDropdownOpen(!isLibraryDropdownOpen)}
                  className={`flex items-center gap-1 ${topLinkClass(libraryGroupActive)}`}
                >
                  Library Search
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isLibraryDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isLibraryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-card-bg rounded-lg shadow-xl border border-border py-2 z-[100]">
                    {librarySearchItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={dropdownItemClass(isLinkActive(item.href, pathname))}
                        onClick={() => setIsLibraryDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              )}
              {!isRfqResponderOnly && (
              <Link
                href="/bidmatching"
                className={topLinkClass(isLinkActive("/bidmatching", pathname))}
              >
                Bid-Matching
              </Link>
              )}
              {!isRfqResponderOnly && isMaximumTier && (
              <Link
                href="/analytics"
                className={topLinkClass(isLinkActive("/analytics", pathname))}
              >
                Analytics
              </Link>
              )}
              {/* RFQ: the full menu shows for everyone as an upsell surface. Received
                  works for all tiers; sender pages self-gate to the upgrade CTA for
                  customers without the request_for_quote add-on. */}
              <div className="relative" ref={rfqDropdownRef}>
                <button
                  onClick={() => setIsRfqDropdownOpen(!isRfqDropdownOpen)}
                  className={`flex items-center gap-1 ${topLinkClass(rfqGroupActive)}`}
                >
                  Vendor RFQs
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isRfqDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isRfqDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-card-bg rounded-lg shadow-xl border border-border py-2 z-[100]">
                    {rfqItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={dropdownItemClass(isGroupItemActive(item, rfqItems, pathname))}
                        onClick={() => setIsRfqDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {/* Help Dropdown */}
              <div className="relative" ref={helpDropdownRef}>
                <button
                  onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
                  className={`flex items-center gap-1 ${topLinkClass(helpGroupActive)}`}
                >
                  Help
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isHelpDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isHelpDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-card-bg rounded-lg shadow-xl border border-border py-2 z-[9999]">
                    {helpItems.map((item) =>
                      "external" in item && item.external ? (
                        <a
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={dropdownItemClass(false)}
                          onClick={() => setIsHelpDropdownOpen(false)}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={dropdownItemClass(isLinkActive(item.href, pathname))}
                          onClick={() => setIsHelpDropdownOpen(false)}
                        >
                          {item.label}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-2 pl-6 border-l border-border">
              <NotificationBell />
              {showAccountLink ? (
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted-light transition-colors"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary uppercase">
                      {userInitial}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground">Account</span>
                </Link>
              ) : (
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col gap-1">
              {!isRfqResponderOnly && mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={mobileRowClass(isLinkActive(item.href, pathname))}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
              {!isRfqResponderOnly && isMaximumTier && (
                <Link
                  href="/analytics"
                  className={mobileRowClass(isLinkActive("/analytics", pathname))}
                  onClick={closeMobileMenu}
                >
                  Analytics
                </Link>
              )}

              {/* Library Search expandable section */}
              {!isRfqResponderOnly && (
              <>
              <button
                onClick={() => setIsMobileLibraryOpen(!isMobileLibraryOpen)}
                className={`flex items-center justify-between w-full text-left ${mobileRowClass(libraryGroupActive)}`}
              >
                <span>Library Search</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileLibraryOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isMobileLibraryOpen && (
                <div className="pl-4">
                  {librarySearchItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={mobileDropdownItemClass(isLinkActive(item.href, pathname))}
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
              </>
              )}

              {/* RFQ: the full menu shows for everyone as an upsell surface. Received
                  works for all tiers; sender pages self-gate to the upgrade CTA. */}
              <button
                onClick={() => setIsMobileRfqOpen(!isMobileRfqOpen)}
                className={`flex items-center justify-between w-full text-left ${mobileRowClass(rfqGroupActive)}`}
              >
                <span>Vendor RFQs</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileRfqOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isMobileRfqOpen && (
                <div className="pl-4">
                  {rfqItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={mobileDropdownItemClass(isGroupItemActive(item, rfqItems, pathname))}
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Help expandable section */}
              <button
                onClick={() => setIsMobileHelpOpen(!isMobileHelpOpen)}
                className={`flex items-center justify-between w-full text-left ${mobileRowClass(helpGroupActive)}`}
              >
                <span>Help</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileHelpOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isMobileHelpOpen && (
                <div className="pl-4">
                  {helpItems.map((item) =>
                    "external" in item && item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={mobileDropdownItemClass(false)}
                        onClick={closeMobileMenu}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={mobileDropdownItemClass(isLinkActive(item.href, pathname))}
                        onClick={closeMobileMenu}
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              )}

              {/* Account / Sign Out */}
              <div className="mt-4 pt-4 border-t border-border">
                {showAccountLink ? (
                  <Link
                    href="/account"
                    className="flex items-center gap-3 px-4 py-3 text-card-foreground hover:text-foreground hover:bg-muted-light rounded-lg transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary uppercase">
                        {userInitial}
                      </span>
                    </div>
                    <span className="font-medium">Account</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      logout();
                    }}
                    className="w-full px-4 py-3 text-left text-card-foreground hover:text-foreground hover:bg-muted-light rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
    {/* System-announcement banner stack — sibling of the header so it
        sits *under* it in document order rather than rendering inside
        the header element. Header is normal-flow, so the banner just
        appears beneath it on the page. */}
    <AnnouncementBanner />
    </>
  );
}
