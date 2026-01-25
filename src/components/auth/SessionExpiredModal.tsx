"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionExpired } from "@/contexts/SessionExpiredContext";

export function SessionExpiredModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, refreshUser } = useAuth();
  const { isModalOpen, hideModal, retryPendingRequests } = useSessionExpired();

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

  // Reset form when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setEmail("");
      setPassword("");
      setError(null);
      setRateLimitSeconds(null);
      setIsSubmitting(false);
    }
  }, [isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rateLimitSeconds) return;

    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);

    setIsSubmitting(false);

    if (result.success) {
      // Refresh user data
      await refreshUser();
      
      // Retry all pending requests
      await retryPendingRequests();
      
      // Close modal
      hideModal();
    } else {
      if (result.retryAfter) {
        setRateLimitSeconds(result.retryAfter);
      }
      setError(result.error || "Login failed");
    }
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => {}} // Prevent closing without login
      title="Session Expired"
      size="md"
      preventClose={true}
    >
      <div className="space-y-6">
        <div>
          <p className="text-muted">
            Your session has expired. Please sign in again to continue.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{error}</p>
            {rateLimitSeconds !== null && rateLimitSeconds > 0 && (
              <p className="text-sm text-muted mt-1">
                Try again in {rateLimitSeconds} second{rateLimitSeconds !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting || !!rateLimitSeconds}
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting || !!rateLimitSeconds}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={isSubmitting || !!rateLimitSeconds}
            >
              {isSubmitting
                ? "Signing in..."
                : rateLimitSeconds
                ? `Wait ${rateLimitSeconds}s`
                : "Sign In"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
