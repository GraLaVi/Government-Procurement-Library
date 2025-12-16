"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
];

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const passwordsMatch = newPassword === confirmPassword;
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(newPassword));
  const canSubmit = currentPassword && newPassword && confirmPassword && passwordsMatch && allRequirementsMet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to change password");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to account page after 2 seconds
      setTimeout(() => {
        router.push("/account");
      }, 2000);
    } catch {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Change Password</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Change Password</h1>
        <p className="text-muted mt-1">
          Update your password to keep your account secure
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-success">
              Password changed successfully! Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Current Password"
            type="password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isSubmitting || success}
          />

          <div>
            <Input
              label="New Password"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isSubmitting || success}
            />

            {/* Password requirements */}
            {newPassword && (
              <div className="mt-3 space-y-2">
                {PASSWORD_REQUIREMENTS.map((req) => {
                  const passed = req.test(newPassword);
                  return (
                    <div key={req.id} className="flex items-center gap-2 text-sm">
                      {passed ? (
                        <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={passed ? "text-success" : "text-muted"}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting || success}
              error={confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined}
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit || isSubmitting || success}
            >
              {isSubmitting ? "Changing Password..." : "Change Password"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              href="/account"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Security tips */}
      <div className="mt-8 bg-primary/5 rounded-xl border border-primary/10 p-6">
        <h3 className="text-sm font-semibold text-secondary mb-3">
          Password Security Tips
        </h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Use a unique password that you don&apos;t use for other accounts</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Consider using a password manager to generate and store secure passwords</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Enable two-factor authentication for additional security</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Never share your password with anyone, including GPH support</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
