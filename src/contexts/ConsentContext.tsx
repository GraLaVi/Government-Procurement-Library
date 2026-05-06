"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentSettingsModal } from "@/components/consent/ConsentSettingsModal";
import { ConsentChoice, StoredConsent } from "@/lib/consent/types";
import {
  DEFAULT_ACCEPTED,
  DEFAULT_REJECTED,
  readStoredConsent,
  writeStoredConsent,
} from "@/lib/consent/storage";

interface ConsentContextValue {
  /** The visitor's current choice. Defaults to "all rejected" until
   *  they actually pick — *do not* rely on this to detect first-visit;
   *  use `hasDecided` for that. */
  consent: ConsentChoice;
  /** True once `readStoredConsent()` has run on mount AND the visitor
   *  has a stored record. False during SSR and on a fresh first visit. */
  hasDecided: boolean;
  /** Persist a new choice (e.g. from the customize modal). */
  setConsent: (choice: ConsentChoice) => void;
  /** Convenience: persist all-on. */
  acceptAll: () => void;
  /** Convenience: persist all-off (except necessary, which is always on). */
  rejectNonEssential: () => void;
  /** Open the settings modal. Used from the footer + the banner. */
  openSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  // Render-stable defaults during SSR + before mount: we treat the
  // visitor as if they rejected non-essential storage. The banner is
  // hidden until mount completes to avoid a hydration flash.
  const [consent, setConsentState] = useState<ConsentChoice>(DEFAULT_REJECTED);
  const [hasDecided, setHasDecided] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const stored = readStoredConsent();
    if (stored) {
      setConsentState(stored.choices);
      setHasDecided(true);
    }
  }, []);

  const persist = useCallback((choice: ConsentChoice): StoredConsent => {
    const record = writeStoredConsent(choice);
    setConsentState(record.choices);
    setHasDecided(true);
    return record;
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasDecided,
      setConsent: (choice) => persist(choice),
      acceptAll: () => persist(DEFAULT_ACCEPTED),
      rejectNonEssential: () => persist(DEFAULT_REJECTED),
      openSettings: () => setIsSettingsOpen(true),
    }),
    [consent, hasDecided, persist],
  );

  // Show the banner only after mount AND only if no decision exists.
  // Delaying until after mount avoids hydration mismatch — server can't
  // know whether the cookie is set.
  const showBanner = hasMounted && !hasDecided && !isSettingsOpen;

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {showBanner && (
        <ConsentBanner
          onAcceptAll={() => persist(DEFAULT_ACCEPTED)}
          onRejectNonEssential={() => persist(DEFAULT_REJECTED)}
          onCustomize={() => setIsSettingsOpen(true)}
        />
      )}
      <ConsentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentChoice={consent}
        onSave={(choice) => {
          persist(choice);
          setIsSettingsOpen(false);
        }}
      />
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
