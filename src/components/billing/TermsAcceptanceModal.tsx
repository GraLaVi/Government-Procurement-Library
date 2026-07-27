"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (tosVersion: string, tosAcceptedAt: string) => void;
  planSummary?: string;
  pending?: boolean;
}

export const TOS_VERSION = "2026-05-04";

export function TermsAcceptanceModal({
  isOpen,
  onCancel,
  onConfirm,
  planSummary,
  pending = false,
}: TermsAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setShowError(false);
    }
  }, [isOpen]);

  // Clear the validation error as soon as the user checks the box.
  useEffect(() => {
    if (accepted) setShowError(false);
  }, [accepted]);

  const handleConfirm = () => {
    if (!accepted) {
      setShowError(true);
      return;
    }
    onConfirm(TOS_VERSION, new Date().toISOString());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm subscription"
      size="md"
      preventClose={pending}
    >
      <div className="space-y-4">
        {planSummary && (
          <div className="bg-muted-light rounded-lg px-4 py-3 text-sm text-foreground">
            {planSummary}
          </div>
        )}

        <p className="text-sm text-foreground">
          Before continuing to secure checkout with Stripe, please review and accept our terms.
        </p>

        <div>
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={pending}
              aria-invalid={showError && !accepted}
              aria-describedby={showError && !accepted ? "tos-error" : undefined}
              className={`mt-1 h-4 w-4 rounded text-primary focus:ring-primary ${
                showError && !accepted ? "border-error ring-2 ring-error/30" : "border-border"
              }`}
            />
            <span className="text-sm text-foreground">
              I have read and agree to the{" "}
              <a
                href="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {showError && !accepted && (
            <p id="tos-error" className="mt-2 text-sm text-error" role="alert">
              Please accept the Terms of Service and Privacy Policy to continue.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={pending}>
            {pending ? "Starting checkout…" : "Confirm and continue to checkout"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
