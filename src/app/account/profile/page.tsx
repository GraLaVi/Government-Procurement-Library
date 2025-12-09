"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (user) {
      const changed =
        firstName !== (user.first_name || "") ||
        lastName !== (user.last_name || "");
      setHasChanges(changed);
    }
  }, [firstName, lastName, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setHasChanges(false);

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitial = user?.first_name?.[0] || user?.email?.[0] || "U";

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
          <li className="text-foreground font-medium">Profile</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Profile Settings</h1>
        <p className="text-muted mt-1">
          Update your personal information
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
              Profile updated successfully!
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

      {/* Profile Form */}
      <div className="bg-white rounded-xl border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar section */}
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-primary uppercase">
                {userInitial}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-secondary">Profile Photo</h3>
              <p className="text-sm text-muted mt-1">
                Your initials are displayed as your avatar
              </p>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Last Name"
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <Input
              label="Email Address"
              type="email"
              value={user?.email || ""}
              disabled
            />
            <p className="text-xs text-muted mt-1">
              Contact support to change your email address
            </p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Account Roles
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span key={role} className="inline-block px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg capitalize">
                    {role.replace(/_/g, " ")}
                  </span>
                ))
              ) : (
                <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg capitalize">
                  user
                </span>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Button
              type="submit"
              variant="primary"
              disabled={!hasChanges || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              href="/account"
            >
              Cancel
            </Button>
            {hasChanges && (
              <span className="text-sm text-muted ml-auto">
                You have unsaved changes
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="mt-8 bg-muted-light rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-secondary mb-4">
          Account Information
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Account ID</dt>
            <dd className="text-foreground font-medium">{user?.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Customer ID</dt>
            <dd className="text-foreground font-medium">{user?.customer_id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Email Status</dt>
            <dd className="flex items-center gap-1.5">
              {user?.email_verified ? (
                <>
                  <span className="w-2 h-2 bg-success rounded-full"></span>
                  <span className="text-success font-medium">Verified</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-warning rounded-full"></span>
                  <span className="text-warning font-medium">Not Verified</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
