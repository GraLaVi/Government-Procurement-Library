"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useConsent } from "@/contexts/ConsentContext";
import { usePreferences } from "@/lib/hooks/usePreferences";
import {
  DEFAULT_PAGE_OPTIONS,
  type DefaultPageSlug,
} from "@/lib/preferences/defaultPage";
import {
  RESULTS_LAYOUT_OPTIONS,
  resolveResultsLayout,
  type ResultsLayout,
} from "@/lib/preferences/resultsLayout";

// ---------------------------------------------------------------------------
// Small presentational controls used across the settings rows.
// ---------------------------------------------------------------------------

interface SegmentedOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-muted-light p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              active
                ? "bg-card-bg text-primary shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.icon && (
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: checked
          ? "var(--primary)"
          : "color-mix(in srgb, var(--muted) 40%, transparent)",
      }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** A single setting: label + hint on the left, control on the right. */
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-0.5 text-xs text-muted sm:max-w-[46ch]">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Theme icons sized for the segmented control.
const THEME_OPTIONS: SegmentedOption[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const { consent, openSettings, setConsent } = useConsent();
  const { preferences, updatePreferences } = usePreferences();

  const [localTheme, setLocalTheme] = useState<"light" | "dark" | "system">("light");
  const [localDefaultPage, setLocalDefaultPage] = useState<DefaultPageSlug>("dashboard");
  // Results layout (tabs vs one-page) reads/writes user_preferences.results_layout
  // through usePreferences, same as default_page.
  const [localResultsLayout, setLocalResultsLayout] = useState<ResultsLayout>("tabs");
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local theme from context
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  // Seed the pickers from preferences once they're loaded. `preferences` is
  // null while loading; the fallbacks keep a sensible selection during fetch.
  useEffect(() => {
    const saved = preferences?.default_page;
    const isKnown = DEFAULT_PAGE_OPTIONS.some((o) => o.slug === saved);
    if (isKnown) {
      setLocalDefaultPage(saved as DefaultPageSlug);
    }
    setLocalResultsLayout(resolveResultsLayout(preferences));
  }, [preferences]);

  const savedDefaultPage =
    (preferences?.default_page as DefaultPageSlug | undefined) ?? "dashboard";
  const savedResultsLayout = resolveResultsLayout(preferences);

  const themeChanged = localTheme !== theme;
  const defaultPageChanged = localDefaultPage !== savedDefaultPage;
  const resultsLayoutChanged = localResultsLayout !== savedResultsLayout;
  const hasChanges = themeChanged || defaultPageChanged || resultsLayoutChanged;

  const markDirty = () => setSuccess(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // setTheme writes through ThemeContext (and persists to the server);
      // updatePreferences writes everything else directly.
      if (themeChanged) {
        await setTheme(localTheme);
      }
      if (defaultPageChanged) {
        await updatePreferences({ default_page: localDefaultPage });
      }
      if (resultsLayoutChanged) {
        await updatePreferences({ results_layout: localResultsLayout });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocalTheme(theme);
    setLocalDefaultPage(savedDefaultPage);
    setLocalResultsLayout(savedResultsLayout);
    setSuccess(false);
  };

  // Cookie toggles persist immediately (they don't ride the Save bar). Only
  // the optional "functional" category is user-editable; necessary is fixed.
  const handleFunctionalToggle = (next: boolean) =>
    setConsent({ necessary: true, functional: next });

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted transition-colors hover:text-primary">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="font-medium text-foreground">Preferences</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Preferences</h1>
        <p className="mt-1 text-muted">Customize how the portal looks and behaves.</p>
      </div>

      {/* Appearance & display */}
      <section className="mb-4 overflow-hidden rounded-xl border border-border bg-card-bg">
        <div className="px-5 pt-4">
          <h2 className="text-base font-semibold text-secondary">Appearance &amp; display</h2>
          <p className="mt-0.5 text-sm text-muted">
            How the portal looks and how search results are arranged.
          </p>
        </div>
        <div className="px-5 pb-2">
          <SettingRow
            title="Theme"
            description="System automatically matches your device setting."
          >
            <Segmented
              ariaLabel="Theme"
              options={THEME_OPTIONS}
              value={localTheme}
              onChange={(v) => {
                setLocalTheme(v as "light" | "dark" | "system");
                markDirty();
              }}
            />
          </SettingRow>

          <SettingRow
            title="Results layout"
            description="Show a vendor or part as separate tabs, or one scrollable page."
          >
            <Segmented
              ariaLabel="Results layout"
              options={RESULTS_LAYOUT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={localResultsLayout}
              onChange={(v) => {
                setLocalResultsLayout(v as ResultsLayout);
                markDirty();
              }}
            />
          </SettingRow>

          <SettingRow
            title="Default page"
            description="Where you land after signing in."
          >
            <select
              aria-label="Default page"
              value={localDefaultPage}
              onChange={(e) => {
                setLocalDefaultPage(e.target.value as DefaultPageSlug);
                markDirty();
              }}
              className="cursor-pointer rounded-md border border-border bg-card-bg py-1.5 pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {DEFAULT_PAGE_OPTIONS.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </select>
          </SettingRow>
        </div>
      </section>

      {/* Privacy */}
      <section className="mb-4 overflow-hidden rounded-xl border border-border bg-card-bg">
        <div className="px-5 pt-4">
          <h2 className="text-base font-semibold text-secondary">Privacy</h2>
          <p className="mt-0.5 text-sm text-muted">
            Control what we store in your browser — applied immediately. See our{" "}
            <Link href="/legal/cookies" className="text-primary hover:underline">
              cookie policy
            </Link>
            .
          </p>
        </div>
        <div className="px-5 pb-3">
          <SettingRow
            title="Strictly necessary"
            description="Required for sign-in, navigation, and remembering your choices."
          >
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-border bg-muted-light px-2 py-0.5 text-[11px] font-medium text-muted">
                Always on
              </span>
              <ToggleSwitch checked disabled ariaLabel="Strictly necessary cookies (always on)" />
            </div>
          </SettingRow>

          <SettingRow
            title="Functional"
            description="Remembers preferences like theme and partially-completed signup forms."
          >
            <ToggleSwitch
              checked={consent.functional}
              onChange={handleFunctionalToggle}
              ariaLabel="Functional cookies"
            />
          </SettingRow>
        </div>
        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={openSettings}
            className="text-xs font-medium text-muted transition-colors hover:text-primary"
          >
            Open full cookie settings &rarr;
          </button>
        </div>
      </section>

      {/* Sticky save bar — governs the display settings above. Cookie toggles
          persist on their own, so they're excluded from the dirty state. */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-card-bg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {isSaving ? (
            <span className="text-muted">Saving…</span>
          ) : success ? (
            <span className="flex items-center gap-1.5 font-medium text-success">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              All changes saved
            </span>
          ) : hasChanges ? (
            <span className="flex items-center gap-2 text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              You have unsaved changes
            </span>
          ) : (
            <span className="text-muted">Up to date</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && !isSaving && (
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-md border border-border bg-card-bg px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted-light"
            >
              Discard
            </button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            variant="primary"
            size="md"
            className="touch-manipulation"
          >
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
