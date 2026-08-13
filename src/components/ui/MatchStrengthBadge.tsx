import { RowBadge } from "@/components/library/RowBadge";

interface Props {
  strength: "HARD" | "SOFT" | null | undefined;
  className?: string;
}

// HARD = filled accent badge (NIIN / MFG_PART_NUMBER / CAGE_CODE hit).
// SOFT = muted outline. NULL renders nothing — pre-migration rows have
// no strength assigned and we don't want to invent one.
export function MatchStrengthBadge({ strength, className = "" }: Props) {
  if (!strength) return null;
  if (strength === "HARD") {
    return (
      <RowBadge tone="sky" className={className}>
        Hard
      </RowBadge>
    );
  }
  return (
    <RowBadge tone="outline" className={className}>
      Soft
    </RowBadge>
  );
}
