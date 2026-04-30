"use client";

import { PASSWORD_RULES } from "@/lib/auth/passwordRules";

type Props = {
  /** Current password value. The component re-runs each rule against it. */
  password: string;
  /** Optional className for the wrapper. */
  className?: string;
};

/**
 * Live checklist of password strength rules.
 *
 * Used on /signup and /account/change-password so users see exactly which
 * rules have been satisfied as they type. The rule definitions live in
 * lib/auth/passwordRules.ts and mirror the backend
 * (src/api/v1/auth/password_rules.py).
 */
export function PasswordRulesChecklist({ password, className = "" }: Props) {
  return (
    <ul className={`text-[11px] space-y-0.5 ${className}`}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={ok ? "text-success" : "text-muted"}
          >
            <span aria-hidden className="mr-1">
              {ok ? "✓" : "○"}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
