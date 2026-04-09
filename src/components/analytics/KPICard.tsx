"use client";

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  source?: string;
}

export function KPICard({ label, value, subtitle, source }: KPICardProps) {
  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
      {subtitle && (
        <div className="text-sm text-muted mt-1">{subtitle}</div>
      )}
      {source && (
        <div className="text-xs text-muted/70 mt-2">{source}</div>
      )}
    </div>
  );
}
