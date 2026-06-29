"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useConsent } from "@/contexts/ConsentContext";
import { usePreferences } from "@/lib/hooks/usePreferences";
import {
  DEFAULT_PAGE_OPTIONS,
  type DefaultPageSlug,
} from "@/lib/preferences/defaultPage";

const COOKIE_CATEGORIES = [
  {
    key: "necessary" as const,
    label: "Strictly necessary",
    description:
      "Required for sign-in, navigation, and remembering your cookie choices. Always on.",
  },
  {
    key: "functional" as const,
    label: "Functional",
    description:
      "Remembers preferences like theme and partially-completed signup forms. On by default.",
  },
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const { consent, hasDecided, openSettings } = useConsent();
  const { preferences, updatePreferences } = usePreferences();
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'system'>('light');
  // The default-page picker reads/writes user_preferences.default_page
  // through usePreferences (not through ThemeContext) — theme has its
  // own context because it needs to apply DOM-side; default_page is
  // pure server state plus a read on login.
  const [localDefaultPage, setLocalDefaultPage] = useState<DefaultPageSlug>('dashboard');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local theme from context
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  // Seed the default-page picker from preferences once they're loaded.
  // `preferences` is null while loading; the option list always falls back
  // to "dashboard" so the UI shows a sensible selection during the fetch.
  useEffect(() => {
    const saved = preferences?.default_page;
    const isKnown = DEFAULT_PAGE_OPTIONS.some((o) => o.slug === saved);
    if (isKnown) {
      setLocalDefaultPage(saved as DefaultPageSlug);
    }
  }, [preferences]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setLocalTheme(newTheme);
    setSuccess(false);
  };

  const handleDefaultPageChange = (slug: DefaultPageSlug) => {
    setLocalDefaultPage(slug);
    setSuccess(false);
  };

  const savedDefaultPage =
    (preferences?.default_page as DefaultPageSlug | undefined) ?? 'dashboard';

  const themeChanged = localTheme !== theme;
  const defaultPageChanged = localDefaultPage !== savedDefaultPage;
  const hasChanges = themeChanged || defaultPageChanged;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Save theme + default_page in whichever order has pending changes.
      // setTheme writes through ThemeContext (and persists to the server);
      // updatePreferences writes everything else directly.
      if (themeChanged) {
        await setTheme(localTheme);
      }
      if (defaultPageChanged) {
        await updatePreferences({ default_page: localDefaultPage });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Light theme',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Dark theme',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system' as const,
      label: 'System',
      description: 'Use system preference',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Preferences</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Preferences</h1>
        <p className="text-muted mt-1">
          Customize your account settings and preferences
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
              Preferences saved successfully!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Theme Preference Section */}
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-secondary mb-1">Appearance</h2>
          <p className="text-sm text-muted">
            Choose your preferred theme. System will automatically match your device settings.
          </p>
        </div>

        <div className="space-y-3">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all text-left touch-manipulation ${
                localTheme === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted-light/50 active:bg-primary/10'
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 ${localTheme === option.value ? 'text-primary' : 'text-muted'}`}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm sm:text-base font-medium ${
                    localTheme === option.value ? 'text-primary' : 'text-foreground'
                  }`}>
                    {option.label}
                  </span>
                  {localTheme === option.value && (
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* Default Page Section */}
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-secondary mb-1">Default page</h2>
          <p className="text-sm text-muted">
            Pick where you&apos;d like to land after signing in. The dashboard
            is used if no preference is set.
          </p>
        </div>

        <div className="space-y-3">
          {DEFAULT_PAGE_OPTIONS.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => handleDefaultPageChange(option.slug)}
              className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all text-left touch-manipulation ${
                localDefaultPage === option.slug
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted-light/50 active:bg-primary/10'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm sm:text-base font-medium ${
                      localDefaultPage === option.slug
                        ? 'text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    {option.label}
                  </span>
                  {localDefaultPage === option.slug && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* Shared save row — applies Appearance + Default page edits. Spans both
          columns so it reads as the save for the two cards above; handleSave is a
          no-op for sections without pending changes. */}
      <div className="lg:col-span-2 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          variant="primary"
          size="md"
          className="w-full sm:w-auto touch-manipulation"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>

      {/* Cookie Preferences Section */}
      <div className="bg-card-bg rounded-xl border border-border p-6 lg:col-span-2">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-secondary mb-1">Cookie Preferences</h2>
          <p className="text-sm text-muted">
            Control what data we store in your browser. See our{" "}
            <Link href="/legal/cookies" className="text-primary hover:underline">
              cookie policy
            </Link>{" "}
            for details on each category.
          </p>
        </div>

        <ul className="space-y-3">
          {COOKIE_CATEGORIES.map((category) => {
            const enabled = consent[category.key];
            const isLocked = category.key === "necessary";
            return (
              <li
                key={category.key}
                className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-medium text-foreground">
                      {category.label}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded border ${
                        enabled
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted-light text-muted border-border"
                      }`}
                    >
                      {enabled ? "On" : "Off"}
                    </span>
                    {isLocked && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded border bg-muted-light text-muted border-border">
                        Always on
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">{category.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted">
            {hasDecided
              ? "You've already made a choice — open the settings to change it."
              : "You haven't made a choice yet. Defaults are shown above."}
          </p>
          <Button
            onClick={openSettings}
            variant="outline"
            size="md"
            className="w-full sm:w-auto touch-manipulation"
          >
            Manage cookie preferences
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}

