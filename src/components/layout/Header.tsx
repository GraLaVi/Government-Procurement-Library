"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

const librarySearchItems = [
  { href: "/library/parts", label: "Parts Search" },
  { href: "/library/vendor-search", label: "Vendor Search" },
];

interface HeaderProps {
  /** Show the Account link with avatar (default: true). Set to false on main account page. */
  showAccountLink?: boolean;
}

export function Header({ showAccountLink = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isLibraryDropdownOpen, setIsLibraryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLibraryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.first_name?.[0] || user?.email?.[0] || "U";

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold text-secondary">Gralavi</span>
          </Link>

          {/* Nav Links + User menu (right-justified) */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
                Dashboard
              </Link>
              {/* Library Search Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsLibraryDropdownOpen(!isLibraryDropdownOpen)}
                  className="flex items-center gap-1 text-muted hover:text-foreground transition-colors"
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
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-border py-2 z-[100]">
                    {librarySearchItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-muted-light transition-colors"
                        onClick={() => setIsLibraryDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/opportunities" className="text-muted hover:text-foreground transition-colors">
                Opportunities
              </Link>
              <Link href="/competitors" className="text-muted hover:text-foreground transition-colors">
                Competitors
              </Link>
              <Link href="/analytics" className="text-muted hover:text-foreground transition-colors">
                Analytics
              </Link>
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
      </div>
    </header>
  );
}
