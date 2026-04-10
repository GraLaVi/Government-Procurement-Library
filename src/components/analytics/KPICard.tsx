"use client";

import Link from 'next/link';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  source?: string;
  href?: string;
}

export function KPICard({ label, value, subtitle, source, href }: KPICardProps) {
  const content = (
    <>
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
      {subtitle && (
        <div className="text-sm text-muted mt-1">{subtitle}</div>
      )}
      {source && (
        <div className="text-xs text-muted/70 mt-2">{source}</div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block bg-card-bg rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-sm transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      {content}
    </div>
  );
}
