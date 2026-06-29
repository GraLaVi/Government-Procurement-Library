"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Blocks free RFQ responder accounts from a section and redirects them to
 * their RFQs-received area (or another target). Responder accounts hold the
 * rfq_responder role with no product entitlements, so the dashboard, library,
 * and bid-matching sections aren't meant for them.
 */
export function RequireNotResponder({
  children,
  redirectTo = "/rfq/received",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { isRfqResponderOnly, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isRfqResponderOnly) {
      router.replace(redirectTo);
    }
  }, [isLoading, isRfqResponderOnly, redirectTo, router]);

  if (isRfqResponderOnly) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}
