"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import {
  DEFAULT_PAGE_FALLBACK,
  resolveDefaultPagePath,
} from "@/lib/preferences/defaultPage";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  // True while a form-driven login is in flight. login() flips
  // isAuthenticated, which would otherwise wake the "already authenticated"
  // effect below and race it against handleSubmit's redirect. This ref lets
  // handleSubmit own the post-login navigation so the two can't disagree.
  const manualLoginRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Validate redirect parameter - don't allow redirecting to auth pages to prevent loops
  const rawRedirect = searchParams.get("redirect");
  const authRoutes = [AUTH_CONFIG.ROUTES.LOGIN, '/forgot-password'];
  // Only accept same-origin relative paths. A value like
  // "https://evil.com" or "//evil.com" would otherwise be handed to
  // router.push/replace and navigate the user off-site (open redirect /
  // phishing vector). Require a single leading "/" and reject protocol-
  // relative ("//") and any "scheme:" prefix.
  // Must start with "/", and the char after it must not be "/" (protocol-
  // relative "//evil.com") or "\" (browsers normalize "/\evil.com" to that).
  const isSafeRedirect = (path: string): boolean =>
    path.startsWith("/") && path[1] !== "/" && path[1] !== "\\";
  // ?redirect=… wins (session-expired flow that wants to bounce the user
  // back to where they were). Without it, fall back to /dashboard here —
  // the post-login handler below upgrades that to the user's
  // default_page preference once preferences are loadable.
  const explicitRedirect =
    rawRedirect && isSafeRedirect(rawRedirect) && !authRoutes.includes(rawRedirect)
      ? rawRedirect
      : null;
  const redirect = explicitRedirect ?? DEFAULT_PAGE_FALLBACK;

  // Fetch the user's preferred default page after a successful login.
  // Best-effort: any failure (network, 401, malformed response) falls
  // back to /dashboard so the login flow never blocks on a preferences
  // hiccup.
  const fetchDefaultPagePath = async (): Promise<string> => {
    try {
      const resp = await fetchWithAuth('/api/auth/me/preferences', {
        credentials: 'include',
      });
      if (!resp.ok) return DEFAULT_PAGE_FALLBACK;
      const data = await resp.json();
      return resolveDefaultPagePath(data?.preferences?.default_page);
    } catch {
      return DEFAULT_PAGE_FALLBACK;
    }
  };

  // Redirect if already authenticated (with timeout fallback). Skipped during
  // a form-driven login — handleSubmit owns that redirect (and is
  // must_change_password-aware); this effect only covers the case where a
  // user with a live session lands on /login directly.
  useEffect(() => {
    if (manualLoginRef.current) return;
    if (!authLoading && isAuthenticated && !redirectAttempted) {
      setRedirectAttempted(true);
      router.replace(redirect);
      
      // Fallback: if redirect doesn't happen within 2 seconds, show login form
      const timeout = setTimeout(() => {
        setRedirectAttempted(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, authLoading, router, redirect, redirectAttempted]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitSeconds && rateLimitSeconds > 0) {
      const timer = setTimeout(() => {
        setRateLimitSeconds((prev) => (prev ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (rateLimitSeconds === 0) {
      setRateLimitSeconds(null);
      setError(null);
    }
  }, [rateLimitSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rateLimitSeconds) return;

    // Claim the redirect before login() flips isAuthenticated, so the
    // "already authenticated" effect stays out of the way for this flow.
    manualLoginRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);

    setIsSubmitting(false);

    if (result.success) {
      if (result.mustChangePassword) {
        router.push("/account/change-password");
      } else if (explicitRedirect) {
        // Honor session-expired bounce or any other ?redirect= over the
        // user's default_page preference.
        router.push(explicitRedirect);
      } else {
        const target = await fetchDefaultPagePath();
        router.push(target);
      }
    } else {
      // Login failed — release the claim so the fallback effect isn't
      // permanently suppressed.
      manualLoginRef.current = false;
      if (result.retryAfter) {
        setRateLimitSeconds(result.retryAfter);
      }
      setError(result.error || "Login failed");
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted-light flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  // Don't render login form if already authenticated and redirect is in progress
  // But show login form if redirect has been attempted and failed
  if (isAuthenticated && !redirectAttempted) {
    return (
      <div className="min-h-screen bg-muted-light dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If authenticated and redirect is in progress, still don't show the form
  if (isAuthenticated && redirectAttempted) {
    return (
      <div className="min-h-screen bg-muted-light dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted-light dark:bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F1D2F] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          {/* Logo — brand nav-lockup (teal bar + wordmark, see .nav-lockup in globals.css) */}
          <Link href="/" className="nav-lockup text-4xl text-white mb-12">
            <span className="wordmark">GPH</span>
          </Link>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Your Gateway to Government Contracts
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-md">
            Access thousands of federal opportunities, track competitors, and win more bids with intelligent contract matching.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div>
              <div className="text-3xl font-bold text-white">45K+</div>
              <div className="text-white/60 text-sm mt-1">Opportunities Added Monthly</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">$1.9T+</div>
              <div className="text-white/60 text-sm mt-1">Contracts Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo — brand nav-lockup */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="nav-lockup text-xl text-secondary">
              <span className="wordmark">GPH</span>
            </Link>
          </div>

          <div className="bg-card-bg text-card-foreground rounded-2xl shadow-xl shadow-secondary/5 border border-border p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-card-foreground">Welcome back</h2>
              <p className="mt-2 text-muted">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                <p className="text-sm text-error">{error}</p>
                {rateLimitSeconds !== null && rateLimitSeconds > 0 && (
                  <p className="text-sm text-muted mt-1">
                    Try again in {rateLimitSeconds} second{rateLimitSeconds !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || !!rateLimitSeconds}
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting || !!rateLimitSeconds}
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !!rateLimitSeconds}
              >
                {isSubmitting
                  ? "Signing in..."
                  : rateLimitSeconds
                  ? `Wait ${rateLimitSeconds}s`
                  : "Sign In"}
              </Button>
            </form>

            {/* Sign up link */}
            <p className="mt-8 text-center text-sm text-muted">
              Don&apos;t have an account?{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                Get started
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen bg-muted-light flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-muted">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
