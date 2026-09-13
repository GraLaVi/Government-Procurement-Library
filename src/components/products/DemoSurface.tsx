"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Wrapper for an interactive product demo built out of the real application
 * components.
 *
 * The demos reuse production components unmodified, and those components link
 * out to routes an anonymous visitor cannot open — a part number into
 * /library/parts, an RFQ reference into /rfq/:id. Left alone, the most
 * inviting thing on the page (a part number that looks like a link, because
 * it is one) would bounce a prospect to the login screen.
 *
 * So every click is inspected in the CAPTURE phase, before React's own
 * handlers or Next's router see it. An anchor pointing back into the app is
 * swallowed and answered with a signup prompt; everything else — expanding a
 * row, sorting, paging, the flag star, and genuinely external links such as
 * the original posting on SAM.gov — is left alone.
 *
 * Capture-phase interception rather than a `demo` prop on the components
 * themselves: they are production code serving paying customers, and they
 * should not grow a branch that only a marketing page takes.
 */
export function DemoSurface({
  children,
  prompt = "Create a free account to open the full record.",
  cta = { href: "/signup?tier=free", label: "Start free →" },
  gateSelector,
  onNavigate,
}: {
  children: React.ReactNode;
  prompt?: string;
  /** Where the prompt sends people. Add-on demos point at pricing rather
   *  than the free signup, since the free tier does not include them. */
  cta?: { href: string; label: string };
  /**
   * Non-anchor elements to gate as well, as a CSS selector. Some production
   * components open a modal that fetches from a <button> rather than
   * linking — the analytics widgets' solicitation numbers do — and a modal
   * showing "Request failed (401)" is exactly what this wrapper exists to
   * prevent.
   */
  gateSelector?: string;
  /**
   * Chance for the demo to answer an in-app link itself — the RFQ demo opens
   * the record for an RFQ reference in place rather than prompting. Return
   * true to say it was handled; the click is still swallowed, but no prompt
   * is shown.
   */
  onNavigate?: (href: string) => boolean;
}) {
  // null = nothing showing; { label: null } = showing the generic prompt.
  const [blocked, setBlocked] = useState<{ label: string | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      const gated = !anchor && gateSelector ? target.closest<HTMLElement>(gateSelector) : null;
      if (!anchor && !gated) return;

      if (anchor) {
        const href = anchor.getAttribute("href") ?? "";
        // Leave real outbound links alone. The SAM.gov posting behind a row
        // is public, opens in a new tab, and is one of the better proofs on
        // the page that these are real solicitations.
        if (/^https?:\/\//i.test(href) || href.startsWith("mailto:")) return;

        if (onNavigate?.(href)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();
      const label = (anchor ?? gated)?.textContent?.trim();
      setBlocked({ label: label && label.length <= 40 ? label : null });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setBlocked(null), 6000);
    },
    [gateSelector, onNavigate],
  );

  return (
    <div className="relative" onClickCapture={onClickCapture}>
      {children}

      {/* Anchored to the demo, not the viewport: a toast that flies in from
          the corner of the screen reads as a site notification rather than an
          answer to the thing just clicked. aria-live so it is announced. */}
      {blocked !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-primary/30 bg-card-bg px-4 py-2 text-sm shadow-lg">
            <span className="text-foreground">
              {blocked.label ? (
                <>
                  <span className="data-field font-semibold">{blocked.label}</span> is live in the app.
                </>
              ) : (
                prompt
              )}
            </span>
            <Link href={cta.href} className="font-semibold text-primary hover:underline">
              {cta.label}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
