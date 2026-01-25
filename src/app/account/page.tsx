"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { Button } from "@/components/ui/Button";

const accountSections = [
  {
    title: "Profile Settings",
    description: "Update your personal information and preferences",
    href: "/account/profile",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: "Manage Users",
    description: "Add, edit, and manage team members",
    href: "/account/users",
    adminOnly: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Subscription",
    description: "Manage your plan and billing details",
    href: "/account/subscription",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: "Bid-Matching Filters",
    description: "View and manage your contract search filters",
    href: "/account/searches",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Notifications",
    description: "Configure email and alert preferences",
    href: "/account/notifications",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Preferences",
    description: "Customize theme and app settings",
    href: "/account/preferences",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Change Password",
    description: "Update your account password",
    href: "/account/change-password",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    title: "API Access",
    description: "Manage API keys and integrations",
    href: "/account/api",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export default function AccountPage() {
  const { user } = useAuth();
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setIsResendingVerification(true);
    setVerificationMessage(null);

    try {
      const response = await fetchWithAuth('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationMessage({ type: 'error', text: data.error || 'Failed to send verification email' });
      } else {
        setVerificationMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
      }
    } catch {
      setVerificationMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email || "User";

  const userInitial = user?.first_name?.[0] || user?.email?.[0] || "U";

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Account</h1>
        <p className="text-muted mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User info card */}
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary uppercase">
              {userInitial}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-card-foreground">
              {userName}
            </h2>
            <p className="text-muted">{user?.email}</p>
            {user?.roles && user.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.roles.map((role) => (
                  <span key={role} className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full capitalize">
                    {role.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button href="/account/profile" variant="outline" size="sm">
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Email Verification Warning Card */}
      {user && !user.email_verified && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Verify Your Email Address
              </h3>
              <p className="text-muted mt-1">
                Your email address <span className="font-medium text-foreground">{user.email}</span> has not been verified.
                Please verify your email to ensure you receive important notifications and can recover your account if needed.
              </p>

              {verificationMessage && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  verificationMessage.type === 'success'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-error/10 text-error border border-error/20'
                }`}>
                  {verificationMessage.text}
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Verification Email'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account sections grid */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Account Settings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accountSections
          .filter((section) => !section.adminOnly || user?.roles?.includes('admin'))
          .map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="bg-card-bg rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                {section.icon}
              </div>
              <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {section.title}
              </h3>
              <p className="text-muted mt-2 text-sm">
                {section.description}
              </p>
            </Link>
          ))}
      </div>

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <div className="text-sm text-muted mb-1">Account Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            <span className="text-lg font-semibold text-card-foreground">Active</span>
          </div>
        </div>
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <div className="text-sm text-muted mb-1">Email Status</div>
          <div className="flex items-center gap-2">
            {user?.email_verified ? (
              <>
                <span className="w-2 h-2 bg-success rounded-full"></span>
                <span className="text-lg font-semibold text-card-foreground">Verified</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-warning rounded-full"></span>
                <span className="text-lg font-semibold text-card-foreground">Not Verified</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <div className="text-sm text-muted mb-1">Member Since</div>
          <div className="text-lg font-semibold text-card-foreground">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </div>
      </div>
    </>
  );
}
