// Self-serve signup live? Mirrors the gate used in /signup and /pricing
// (NEXT_PUBLIC_ENABLE_DEV_SIGNUP). true = paid/free self-serve via /pricing;
// false = private beta, every applicant goes to the beta-application queue.
export const SELF_SERVE_SIGNUP =
  process.env.NEXT_PUBLIC_ENABLE_DEV_SIGNUP === "true";

// Where a generic "Sign up" CTA should land the visitor:
//   self-serve → /pricing (choose a tier first, then signup carries the intent)
//   beta       → /signup  (beta application queue; tier params are ignored)
// NEXT_PUBLIC_* is inlined at build time, so this is a plain constant — safe to
// use directly in JSX hrefs with no hydration mismatch.
export const SIGNUP_ENTRY_HREF = SELF_SERVE_SIGNUP ? "/pricing" : "/signup";
