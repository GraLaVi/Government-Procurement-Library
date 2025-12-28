"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

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
  return (
    <div className="bg-white rounded-lg border border-border p-8 max-w-2xl mx-auto">
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

        {/* Not Authorized Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">Not Authorized</h1>
        <p className="text-muted">
          You don't currently have access to {featureName}
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

      {/* How to Get Access */}
      <div className="bg-muted-light rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">How to Get Access</h2>
        <p className="text-sm text-muted">
          To access this feature, please contact your account administrator or upgrade your subscription plan.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button href="/dashboard" variant="primary" size="md">
          Go to Dashboard
        </Button>
        <Button href="/account" variant="outline" size="md">
          View Account Settings
        </Button>
      </div>
    </div>
  );
}

