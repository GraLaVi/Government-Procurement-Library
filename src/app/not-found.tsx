import Link from "next/link";

// App-wide 404. Without this file Next falls back to its built-in not-found
// page, which is unstyled and — the reason this exists — was being served
// with an HTTP 200 for unknown /start, /help and /legal slugs.
export default function NotFound() {
  return (
    <main className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        404
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 text-muted">
        The link may be out of date, or the address may have a typo in it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        <Link href="/" className="text-primary font-medium hover:underline">
          Go to the homepage
        </Link>
        <Link href="/pricing" className="text-primary font-medium hover:underline">
          Plans and pricing
        </Link>
        <Link href="/help" className="text-primary font-medium hover:underline">
          Help center
        </Link>
        <Link href="/contact" className="text-primary font-medium hover:underline">
          Contact us
        </Link>
      </div>
    </main>
  );
}
