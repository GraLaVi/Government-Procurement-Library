"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConsentChoice } from "@/lib/consent/types";

interface CategoryDef {
  key: "necessary" | "functional" | "analytics" | "marketing";
  label: string;
  description: string;
  examples: string;
  alwaysOn?: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "necessary",
    label: "Strictly necessary",
    description:
      "Required for the site to work — signing in, staying signed in, and remembering your consent choice itself.",
    examples:
      "govt_proc_hub_access_token, govt_proc_hub_refresh_token, gph_cookie_consent",
    alwaysOn: true,
  },
  {
    key: "functional",
    label: "Functional",
    description:
      "Remembers preferences and in-progress forms across pages so you don't lose work.",
    examples: "theme (light/dark), gph_pending_signup, gph_waitlist",
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "We don't use any analytics today. Reserved so this choice carries forward if we ever add page-view or feature-usage measurement.",
    examples: "(none today)",
  },
  {
    key: "marketing",
    label: "Marketing",
    description:
      "We don't use any advertising or cross-site tracking today. Reserved so this choice carries forward if we ever add it.",
    examples: "(none today)",
  },
];

interface ConsentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChoice: ConsentChoice;
  onSave: (choice: ConsentChoice) => void;
}

export function ConsentSettingsModal({
  isOpen,
  onClose,
  currentChoice,
  onSave,
}: ConsentSettingsModalProps) {
  const [draft, setDraft] = useState<ConsentChoice>(currentChoice);

  // When the modal reopens, sync the draft with the latest stored
  // choice so the toggles reflect what's actually persisted.
  useEffect(() => {
    if (isOpen) setDraft(currentChoice);
  }, [isOpen, currentChoice]);

  const toggle = (key: CategoryDef["key"]) => {
    if (key === "necessary") return;
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cookie preferences" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Choose which categories of browser storage to allow.
          Strictly-necessary storage is always on. See our{" "}
          <Link href="/legal/cookies" className="text-primary hover:underline">
            cookie policy
          </Link>{" "}
          for the full list.
        </p>

        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const enabled = cat.alwaysOn ? true : !!draft[cat.key];
            return (
              <label
                key={cat.key}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  enabled
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted-light/30"
                } ${cat.alwaysOn ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={cat.alwaysOn}
                  onChange={() => toggle(cat.key)}
                  className="mt-1 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {cat.label}
                    </span>
                    {cat.alwaysOn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-light text-muted border border-border uppercase tracking-wide">
                        Always on
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                  <p className="text-[11px] text-muted/80 mt-1 font-mono break-all">
                    {cat.examples}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(draft)}>
            Save preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
}
