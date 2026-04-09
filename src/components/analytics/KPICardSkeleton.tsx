"use client";

export function KPICardSkeleton() {
  return (
    <div className="bg-card-bg rounded-xl border border-border p-6 animate-pulse">
      <div className="h-4 w-32 bg-muted-light rounded mb-2" />
      <div className="h-8 w-24 bg-muted-light rounded" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="bg-card-bg rounded-xl border border-border p-6 animate-pulse">
      <div className="h-5 w-48 bg-muted-light rounded mb-4" />
      <div className={`${height} bg-muted-light rounded`} />
    </div>
  );
}
