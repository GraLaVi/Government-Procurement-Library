"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_CONFIG } from "@/lib/auth/config";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Validate redirect parameter - don't allow redirecting to auth pages to prevent loops
  const rawRedirect = searchParams.get("redirect");
  const authRoutes = [AUTH_CONFIG.ROUTES.LOGIN, '/forgot-password', '/trial'];
  const redirect = rawRedirect && !authRoutes.includes(rawRedirect) 
    ? rawRedirect 
    : AUTH_CONFIG.ROUTES.ACCOUNT;

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
      <div className="hidden lg:flex lg:w-1/2 bg-secondary dark:bg-[#1C2C54] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="text-2xl font-bold text-white">GPH</span>
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
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-white/60 text-sm mt-1">Opportunities Monthly</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">$4.2B+</div>
              <div className="text-white/60 text-sm mt-1">Contracts Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="text-xl font-bold text-secondary">GPH</span>
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
              <Link href="/trial" className="text-primary font-medium hover:underline">
                Start free trial
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
