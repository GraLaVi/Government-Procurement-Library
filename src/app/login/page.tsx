"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_CONFIG } from "@/lib/auth/config";

// Surface the right copy for the three "inactive" 403 variants the backend
// returns. The substrings come from src/api/v1/auth/service.py.
function classifyLoginError(error: string): "pending_approval" | "rejected" | null {
  const e = error.toLowerCase();
  if (e.includes("beta application is under review")) return "pending_approval";
  if (e.includes("beta application was not approved")) return "rejected";
  return null;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Validate redirect parameter - don't allow redirecting to auth pages to prevent loops
  const rawRedirect = searchParams.get("redirect");
  const authRoutes = [AUTH_CONFIG.ROUTES.LOGIN, '/forgot-password'];
  // Default landing after sign-in is /dashboard. Honor ?redirect=… if present
  // (e.g., session-expired flow that wants to bounce the user back to where
  // they were); fall back to /dashboard for the plain "go to /login + sign
  // in" path.
  const redirect = rawRedirect && !authRoutes.includes(rawRedirect)
    ? rawRedirect
    : '/dashboard';

  // Redirect if already authenticated (with timeout fallback)
  useEffect(() => {
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

    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);

    setIsSubmitting(false);

    if (result.success) {
      if (result.mustChangePassword) {
        router.push("/account/change-password");
      } else {
        router.push(redirect);
      }
    } else {
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
            {error && (() => {
              const kind = classifyLoginError(error);
              if (kind === "pending_approval") {
                const resend = async () => {
                  if (!email) return;
                  setResendingVerification(true);
                  setResendMessage(null);
                  try {
                    const resp = await fetch("/api/auth/resend-verification", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    const data = await resp.json();
                    setResendMessage(
                      resp.ok
                        ? "Verification email sent — check your inbox."
                        : data.error || "Failed to send verification email.",
                    );
                  } catch {
                    setResendMessage("An unexpected error occurred. Please try again.");
                  } finally {
                    setResendingVerification(false);
                  }
                };
                return (
                  <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm font-medium text-foreground">
                      Your beta application is under review.
                    </p>
                    <p className="text-sm text-muted mt-1">
                      We&apos;ll email you when your account is approved. In
                      the meantime, please make sure your email is verified.
                    </p>
                    {email && (
                      <button
                        type="button"
                        onClick={resend}
                        disabled={resendingVerification}
                        className="mt-2 text-sm text-primary font-medium hover:underline disabled:opacity-50"
                      >
                        {resendingVerification ? "Sending…" : "Resend verification email"}
                      </button>
                    )}
                    {resendMessage && (
                      <p className="text-xs text-muted mt-2">{resendMessage}</p>
                    )}
                  </div>
                );
              }
              if (kind === "rejected") {
                return (
                  <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-sm font-medium text-foreground">
                      Your beta application wasn&apos;t approved.
                    </p>
                    <p className="text-sm text-muted mt-1">
                      If you&apos;d like to discuss your use case, please email{" "}
                      <a href="mailto:support@gphusa.com" className="text-primary hover:underline">
                        support@gphusa.com
                      </a>
                      .
                    </p>
                  </div>
                );
              }
              return (
                <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-sm text-error">{error}</p>
                  {rateLimitSeconds !== null && rateLimitSeconds > 0 && (
                    <p className="text-sm text-muted mt-1">
                      Try again in {rateLimitSeconds} second{rateLimitSeconds !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            })()}

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
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
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
