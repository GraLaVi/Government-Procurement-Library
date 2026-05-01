import Link from "next/link";

export function BetaBanner() {
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-primary text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 bg-white/15 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide">
          Beta
        </span>
        <span className="hidden sm:inline">
          GPH is now in private beta with select defense contractors.
        </span>
        <span className="sm:hidden">Now in private beta.</span>
        <Link
          href="/signup"
          className="font-semibold underline-offset-2 hover:underline"
        >
          Request access →
        </Link>
      </div>
    </div>
  );
}
