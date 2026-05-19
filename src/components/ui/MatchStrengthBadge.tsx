import { Badge } from "./Badge";

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
      <Badge variant="info" size="sm" className={className}>
        Hard
      </Badge>
    );
  }
  return (
    <Badge variant="default" size="sm" className={`border border-border bg-transparent ${className}`}>
      Soft
    </Badge>
  );
}
