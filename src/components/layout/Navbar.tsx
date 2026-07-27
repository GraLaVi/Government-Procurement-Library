"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { MenuIcon, CloseIcon } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";

// Whether the given href should render as "current". Real routes match
// on exact path or sub-path (so /library/parts/123 still highlights the
// /library/parts link). Hash links (e.g. "/#features") are anchor jumps
// on the home page — there's no concept of "being on" one of them, so
// they never highlight (otherwise every anchor link would light up
// simultaneously while sitting on "/").
function isLinkActive(href: string, pathname: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// A dropdown trigger is "active" when any of its child items is the
// current page — so navigating to /library/parts highlights the
// "Library Search" button.
function isGroupActive(items: { href: string }[], pathname: string): boolean {
  return items.some((it) => isLinkActive(it.href, pathname));
}

// Links shown to authenticated users (excludes Pricing — they reach it via /account/billing).
const navLinks = [
  { href: "/#products", label: "Products" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
];

// Links shown to unauthenticated visitors. Pricing is surfaced here so visitors
// can compare plans before signing up.
const visitorNavLinks = [
  { href: "/#products", label: "Products" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
];

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

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLibraryDropdownOpen, setIsLibraryDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [isMobileHelpOpen, setIsMobileHelpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname() || "/";

  const userInitial = user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U";

  // Visual treatment for active vs idle nav targets. Kept inline so the
  // same classes apply to <Link> rows and dropdown <button> triggers.
  const topLinkClass = (active: boolean) =>
    `transition-colors duration-200 ${
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
  const mobileLinkClass = (active: boolean) =>
    `transition-colors duration-200 py-2 ${
      active
        ? "text-primary font-semibold"
        : "text-card-foreground hover:text-foreground"
    }`;
  const mobileDropdownItemClass = (active: boolean) =>
    `block text-sm transition-colors py-1 ${
      active
        ? "text-primary font-medium"
        : "text-card-foreground hover:text-foreground"
    }`;

  const libraryGroupActive = isGroupActive(librarySearchItems, pathname);
  const helpGroupActive = isGroupActive(helpItems, pathname);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLibraryDropdownOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setIsHelpDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-card-bg/95 backdrop-blur-sm border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — nav-lockup: teal vertical bar + GPH wordmark (Figtree 700,
              -10.8% tracking). See docs/plans/branding_guidelines.md. */}
          <Link href="/" className="nav-lockup" aria-label="GPH home">
            <span className="wordmark text-xl text-card-foreground">GPH</span>
          </Link>

          {/* Desktop Navigation
              Order: marketing links first (Products, Features, How It Works,
              and Pricing for visitors), then the in-app tool dropdowns and
              Bid Matching for authenticated users. Mirrors Header.tsx so the
              landing-page nav stays consistent with the in-app nav. */}
          <div className="hidden md:flex items-center gap-8">
            {(isAuthenticated ? navLinks : visitorNavLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={topLinkClass(isLinkActive(link.href, pathname))}
              >
                {link.label}
              </Link>
            ))}
            {/* Library Search Dropdown - Only for authenticated users */}
            {!isLoading && isAuthenticated && (
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
            {/* Bid Matching - Only for authenticated users. Plain link
                (no dropdown); the page itself gates by tier. */}
            {!isLoading && isAuthenticated && (
              <Link
                href="/bidmatching"
                className={topLinkClass(isLinkActive("/bidmatching", pathname))}
              >
                Bid Matching
              </Link>
            )}
            {/* Help Dropdown - Only for authenticated users */}
            {!isLoading && isAuthenticated && (
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
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {!isLoading && isAuthenticated ? (
              <>
                <Button href="/dashboard" variant="ghost" size="sm">
                  Dashboard
                </Button>
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted-light transition-colors"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary uppercase">
                      {userInitial}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">Account</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button href="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button href="/pricing" variant="primary" size="sm">
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-card-foreground hover:text-foreground transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Mobile Navigation
            Same order as desktop: marketing links first, then in-app tools. */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {(isAuthenticated ? navLinks : visitorNavLinks).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileLinkClass(isLinkActive(link.href, pathname))}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile Library Search - Only for authenticated users */}
              {!isLoading && isAuthenticated && (
                <div>
                  <button
                    onClick={() => setIsMobileLibraryOpen(!isMobileLibraryOpen)}
                    className={`flex items-center justify-between w-full ${mobileLinkClass(libraryGroupActive)}`}
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
                    <div className="pl-4 mt-2 space-y-2 border-l-2 border-border">
                      {librarySearchItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={mobileDropdownItemClass(isLinkActive(item.href, pathname))}
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsMobileLibraryOpen(false);
                          }}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Mobile Bid Matching - Only for authenticated users */}
              {!isLoading && isAuthenticated && (
                <Link
                  href="/bidmatching"
                  className={mobileLinkClass(isLinkActive("/bidmatching", pathname))}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bid Matching
                </Link>
              )}
              {/* Mobile Help - Only for authenticated users */}
              {!isLoading && isAuthenticated && (
                <div>
                  <button
                    onClick={() => setIsMobileHelpOpen(!isMobileHelpOpen)}
                    className={`flex items-center justify-between w-full ${mobileLinkClass(helpGroupActive)}`}
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
                    <div className="pl-4 mt-2 space-y-2 border-l-2 border-border">
                      {helpItems.map((item) =>
                        "external" in item && item.external ? (
                          <a
                            key={item.href}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={mobileDropdownItemClass(false)}
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsMobileHelpOpen(false);
                            }}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={mobileDropdownItemClass(isLinkActive(item.href, pathname))}
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsMobileHelpOpen(false);
                            }}
                          >
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {!isLoading && isAuthenticated ? (
                  <>
                    <Button href="/dashboard" variant="primary" size="md">
                      Dashboard
                    </Button>
                    <Link
                      href="/account"
                      className="flex items-center gap-3 py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-base font-semibold text-primary uppercase">
                          {userInitial}
                        </span>
                      </div>
                      <span className="text-base font-medium text-foreground">My Account</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button href="/login" variant="outline" size="md">
                      Sign in
                    </Button>
                    <Button href="/pricing" variant="primary" size="md">
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
    {/* System-announcement banner — sibling of the fixed <header> so
        it lives *outside* the navbar in the DOM. The marketing-area
        Navbar uses position:fixed (height h-16 = 64px), so we mirror
        that with our own fixed wrapper anchored at top:64px to keep
        the banner pinned directly beneath the nav row on scroll. */}
    <div className="fixed top-16 left-0 right-0 z-40 pointer-events-none">
      <div className="pointer-events-auto">
        <AnnouncementBanner />
      </div>
    </div>
    </>
  );
}
