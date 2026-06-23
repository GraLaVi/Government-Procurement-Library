"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";

const librarySearchItems = [
  { href: "/library/parts", label: "Parts Search" },
  { href: "/library/vendor-search", label: "Vendor Search" },
];

const helpItems = [
  { href: "/help", label: "Help Center" },
  { href: "/library/code-definitions", label: "Code Definitions" },
  { href: "/contact", label: "Contact Us" },
];

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bidmatching", label: "Bid-Matching" },
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

interface HeaderProps {
  /** Show the Account link with avatar (default: true). Set to false on main account page. */
  showAccountLink?: boolean;
}

export function Header({ showAccountLink = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isLibraryDropdownOpen, setIsLibraryDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [isMobileHelpOpen, setIsMobileHelpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";

  const libraryGroupActive = isGroupActive(librarySearchItems, pathname);
  const helpGroupActive = isGroupActive(helpItems, pathname);

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
              <Link
                href="/dashboard"
                className={topLinkClass(isLinkActive("/dashboard", pathname))}
              >
                Dashboard
              </Link>
              {/* Library Search Dropdown */}
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
              <Link
                href="/bidmatching"
                className={topLinkClass(isLinkActive("/bidmatching", pathname))}
              >
                Bid-Matching
              </Link>
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
                    {helpItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={dropdownItemClass(isLinkActive(item.href, pathname))}
                        onClick={() => setIsHelpDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-4 pl-6 border-l border-border">
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
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={mobileRowClass(isLinkActive(item.href, pathname))}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}

              {/* Library Search expandable section */}
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
                  {helpItems.map((item) => (
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
