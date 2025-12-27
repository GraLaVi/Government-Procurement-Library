"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local theme from context
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setLocalTheme(newTheme);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await setTheme(localTheme);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = localTheme !== theme;

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

      {/* Theme Preference Section */}
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-6">
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

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-border">
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
      </div>
    </div>
  );
}

