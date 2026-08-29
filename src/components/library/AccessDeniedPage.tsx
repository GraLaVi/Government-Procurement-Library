"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

interface AccessDeniedPageProps {
  featureName: string;
  featureKey: string;
  description: string;
  benefits: string[];
}

export function AccessDeniedPage({
  featureName,
  featureKey,
  description,
  benefits,
}: AccessDeniedPageProps) {
  // Read here rather than as a prop: every one of this component's call sites
  // is a gated page that would otherwise have to remember to pass it, and the
  // one that forgot would be the one showing a member a button they cannot use.
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  return (
    <div className="bg-card-bg rounded-lg border border-border p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        {/* Lock Icon */}
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Unlock {featureName}
        </h1>
        <p className="text-muted">
          This feature isn’t included in your current plan.
        </p>
      </div>

      {/* Feature Description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">About {featureName}</h2>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>

      {/* Benefits Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Key Benefits</h2>
        <ul className="space-y-2">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-muted">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How to Get Access. Members are told to ask; only an admin is told to
          buy, because only an admin can. */}
      <div className="bg-muted-light rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">How to Get Access</h2>
        <p className="text-sm text-muted">
          {isAdmin
            ? "To access this feature, upgrade your subscription plan or add it as an add-on."
            : "Ask your account administrator to add this to your plan — they manage your subscription and seats."}
        </p>
      </div>

      {/* Admin-only. /account/billing redirects a member straight back to
          /account ("Billing is managed by your account administrator"), so
          this button used to be a dead end for exactly the people most likely
          to hit this page. /pricing would load, but a member cannot act on it
          either — buying is the admin's to do. */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button href="/pricing" variant="primary" size="md">
            View Pricing
          </Button>
          <Button href="/account/billing" variant="outline" size="md">
            Manage Billing
          </Button>
        </div>
      )}
    </div>
  );
}

