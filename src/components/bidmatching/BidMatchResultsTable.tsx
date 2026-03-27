"use client";

interface MatchedCondition {
  condition_type: string;
  match_value: string;
  condition_id?: number | null;
}

interface BidMatchResult {
  result_id: number;
  run_id: string;
  solicitation_id: number;
  profile_id: number;
  profile_name: string;
  matched_conditions: MatchedCondition[];
  created_at: string;
  solicitation_number: string | null;
  agency_code: string | null;
  issue_date: string | null;
  close_date: string | null;
  status: string | null;
  buyer_name: string | null;
  set_aside: string | null;
}

interface BidMatchResultsTableProps {
  results: BidMatchResult[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ConditionBadge({ condition }: { condition: MatchedCondition }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent-foreground border border-accent/20">
      <span className="font-semibold text-muted-foreground">{condition.condition_type}:</span>
      <span>{condition.match_value}</span>
    </span>
  );
}

export function BidMatchResultsTable({
  results,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: BidMatchResultsTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="mt-4 text-muted-foreground">No matches found for this date.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()} matches
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted-light border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Solicitation</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Close Date</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Set-Aside</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Profile</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Matched On</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.result_id} className="border-b border-border last:border-0 hover:bg-muted-light/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{result.solicitation_number || "-"}</div>
                  {result.agency_code && (
                    <div className="text-xs text-muted-foreground mt-0.5">{result.agency_code}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    result.status === "OPEN" ? "bg-green-100 text-green-800" :
                    result.status === "CLOSED" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {result.status || "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(result.close_date)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {result.set_aside || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {result.profile_name}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {result.matched_conditions.map((cond, idx) => (
                      <ConditionBadge key={idx} condition={cond} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
