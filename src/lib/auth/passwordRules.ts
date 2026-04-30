/**
 * Customer password strength rules — frontend mirror of
 * src/api/v1/auth/password_rules.py on the backend. Keep these two files
 * in lock-step: a password the UI accepts must also pass server validation,
 * and vice versa.
 *
 * Rules (NIST 800-63B-aligned, modest):
 *   * 8–128 characters
 *   * at least one uppercase letter
 *   * at least one lowercase letter
 *   * at least one digit
 *
 * No required special character — modern guidance favors length over symbol
 * diversity.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordRule = {
  /** stable id used as React key */
  id: "length" | "upper" | "lower" | "digit";
  /** human-readable rule, used in the UI checklist */
  label: string;
  /** evaluator */
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "digit",
    label: "One number",
    test: (p) => /\d/.test(p),
  },
];

/** Returns true iff every rule passes. */
export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

/** Returns the first failing rule's label, or null if the password is fine.
 *  Useful when you want a single string to show on submit. */
export function firstPasswordViolation(password: string): string | null {
  for (const r of PASSWORD_RULES) {
    if (!r.test(password)) return r.label;
  }
  return null;
}
