// Date display helpers. We store/transport ISO 8601; these format for reading.

/**
 * Format an ISO value as mm/dd/yyyy. Handles both date-only (`yyyy-mm-dd`) and
 * full datetime (`...T...Z`) inputs. Date-only values are formatted by string
 * slicing so they never shift across a timezone boundary; datetimes are
 * rendered in the local zone. Returns "—" for empty/invalid values.
 */
export function formatDateMmDdYyyy(value: string | null | undefined): string {
  if (!value) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return `${dateOnly[2]}/${dateOnly[3]}/${dateOnly[1]}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
