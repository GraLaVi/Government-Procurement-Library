"use client";

import { useCallback, useEffect, useState } from "react";

type Severity = "info" | "warning" | "critical";

interface Announcement {
  id: number;
  title: string;
  body_markdown: string;
  severity: Severity;
  cta_label?: string | null;
  cta_url?: string | null;
  expires_at: string;
  dismissable: boolean;
}

// 60s feels right — announcements are rare, so the banner update is
// allowed to be eventually-consistent. We also re-fetch on visibility
// change so a returning tab sees the latest state right away.
const POLL_MS = 60_000;

// Per-severity tokens used by the alert card. `accent` drives the left
// stripe + icon background, `text` is the title color, `body` is the
// description color, `cardBg`/`cardBorder` is the surrounding card.
const SEVERITY: Record<
  Severity,
  {
    accent: string;
    iconBg: string;
    iconText: string;
    title: string;
    body: string;
    cardBg: string;
    cardBorder: string;
    cta: string;
    dismiss: string;
  }
> = {
  info: {
    accent: "bg-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    title: "text-blue-900",
    body: "text-blue-800/90",
    cardBg: "bg-blue-50",
    cardBorder: "border-blue-200",
    cta: "text-blue-700 hover:text-blue-900",
    dismiss: "text-blue-600 hover:text-blue-900 hover:bg-blue-100",
  },
  warning: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    title: "text-amber-900",
    body: "text-amber-800/90",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
    cta: "text-amber-800 hover:text-amber-900",
    dismiss: "text-amber-700 hover:text-amber-900 hover:bg-amber-100",
  },
  critical: {
    accent: "bg-red-600",
    iconBg: "bg-red-100",
    iconText: "text-red-700",
    title: "text-red-900",
    body: "text-red-800/90",
    cardBg: "bg-red-50",
    cardBorder: "border-red-300",
    cta: "text-red-800 hover:text-red-900",
    dismiss: "text-red-700 hover:text-red-900 hover:bg-red-100",
  },
};

// Bare-minimum markdown rendering for the banner body. Supports the
// common inline subset:
//   **bold**   __bold__
//   *italic*   _italic_
//   `code`
//   [label](https://…)
//   newline → <br/>
//
// `<strong>` is rendered with an explicit `font-bold` Tailwind class so
// that any ambient CSS reset that neutralises the browser default
// (e.g. a `prose` plugin or third-party stylesheet) doesn't strip the
// boldness. Same defensive style on `<em>` and `<code>`.
function renderInlineMarkdown(s: string): string {
  let out = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Inline code first — its contents shouldn't be re-processed for
  // bold/italic. Use a sentinel to protect it.
  const codeBlocks: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_, body) => {
    codeBlocks.push(body);
    return " CODE" + (codeBlocks.length - 1) + " ";
  });

  // Bold: **text** OR __text__
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="font-bold">$1</strong>');
  out = out.replace(/__([^_\n]+?)__/g, '<strong class="font-bold">$1</strong>');

  // Italic: *text* OR _text_ (must not be inside a word, i.e. not preceded
  // by an alphanumeric, to avoid mangling things like file_names).
  out = out.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?:;]|$)/g, '$1<em class="italic">$2</em>');
  out = out.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,!?:;]|$)/g, '$1<em class="italic">$2</em>');

  // Links: [label](https://url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" class="underline" target="_blank" rel="noopener">$1</a>',
  );

  // Newlines → <br/>
  out = out.replace(/\n/g, "<br/>");

  // Restore code blocks last so their content stays verbatim.
  out = out.replace(/CODE(\d+)/g, (_, i) => {
    const body = codeBlocks[Number(i)];
    return `<code class="px-1 py-0.5 rounded bg-black/5 text-[12px] font-mono">${body}</code>`;
  });

  return out;
}

// Exported so the admin dashboard's preview pane can render exactly the
// same way the customer banner will.
export { renderInlineMarkdown };

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function CriticalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CtaArrow() {
  return (
    <svg className="w-3.5 h-3.5 inline-block ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function severityIcon(s: Severity) {
  if (s === "critical") return <CriticalIcon />;
  if (s === "warning") return <WarningIcon />;
  return <InfoIcon />;
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [dismissing, setDismissing] = useState<number | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements/active", { credentials: "include" });
      if (!res.ok) return;
      const data: Announcement[] = await res.json();
      setItems(data);
    } catch {
      // Silent fail — a missed poll is fine, we'll try again next cycle.
    }
  }, []);

  useEffect(() => {
    fetchActive();
    const intervalId = setInterval(fetchActive, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchActive();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchActive]);

  const dismiss = async (id: number) => {
    setDismissing(id);
    // Optimistic remove — re-fetch the active set on failure.
    setItems((prev) => prev?.filter((a) => a.id !== id) ?? null);
    try {
      const res = await fetch(`/api/announcements/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) fetchActive();
    } finally {
      setDismissing((cur) => (cur === id ? null : cur));
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      // Mirror the AccountLayout `<main>` exactly so the alert card
      // aligns flush with the content cards below it. The `w-full` is
      // load-bearing inside the layout's flex column — without it the
      // wrapper width can collapse to its content and read narrower
      // than the main element next to it.
      className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-2"
    >
      {items.map((a) => {
        const tone = SEVERITY[a.severity] ?? SEVERITY.info;
        return (
          <div
            key={a.id}
            role="alert"
            className={`relative overflow-hidden rounded-lg border ${tone.cardBorder} ${tone.cardBg} shadow-sm`}
          >
            {/* Left accent stripe */}
            <div className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} aria-hidden="true" />

            <div className="flex items-start gap-3 pl-4 pr-3 py-3">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full ${tone.iconBg} ${tone.iconText} flex items-center justify-center`}
                aria-hidden="true"
              >
                {severityIcon(a.severity)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className={`text-sm font-semibold ${tone.title}`}>{a.title}</div>
                <div
                  className={`text-[13px] leading-snug mt-0.5 ${tone.body}`}
                  dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(a.body_markdown) }}
                />
                {a.cta_url && a.cta_label && (
                  <a
                    href={a.cta_url}
                    target="_blank"
                    rel="noopener"
                    className={`mt-1.5 inline-flex items-center text-[13px] font-medium ${tone.cta} hover:underline`}
                  >
                    {a.cta_label}
                    <CtaArrow />
                  </a>
                )}
              </div>

              {/* Dismiss button */}
              {a.dismissable && (
                <button
                  type="button"
                  onClick={() => dismiss(a.id)}
                  disabled={dismissing === a.id}
                  aria-label="Dismiss announcement"
                  className={`flex-shrink-0 rounded p-1 transition-colors ${tone.dismiss}`}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnnouncementBanner;
