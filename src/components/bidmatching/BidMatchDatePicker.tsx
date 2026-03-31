"use client";

interface DateEntry {
  match_date: string;
  match_count: number;
}

interface BidMatchDatePickerProps {
  dates: DateEntry[];
  selectedDate: string | null;
  onDateChange: (date: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

export function BidMatchDatePicker({ dates, selectedDate, onDateChange }: BidMatchDatePickerProps) {
  if (dates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap mr-1">
        Issue Date:
      </span>
      {dates.map((entry) => {
        const isSelected = entry.match_date === selectedDate;
        return (
          <button
            key={entry.match_date}
            onClick={() => onDateChange(entry.match_date)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              whitespace-nowrap transition-colors border
              ${isSelected
                ? "bg-primary text-white border-primary"
                : "bg-card-bg text-card-foreground border-border hover:bg-muted-light hover:border-primary/30"
              }
            `}
          >
            {formatDate(entry.match_date)}
            <span
              className={`
                inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold
                ${isSelected ? "bg-white/20 text-white" : "bg-muted-light text-muted-foreground"}
              `}
            >
              {formatCount(entry.match_count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
