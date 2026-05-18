"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface ShortcutConfig {
  id: string;
  label: string;
  placeholder: string;
  buildHref: (query: string) => string;
}

const shortcuts: ShortcutConfig[] = [
  {
    id: "nsn",
    label: "Search by NSN/NIIN",
    placeholder: "e.g. 5310-00-123-4567",
    buildHref: (q) => `/library/parts?search_type=nsn_niin&q=${encodeURIComponent(q)}`,
  },
  {
    id: "cage",
    label: "Look up a vendor by CAGE",
    placeholder: "e.g. 0WMA8",
    buildHref: (q) => `/library/vendor-search?cage_code=${encodeURIComponent(q)}`,
  },
];

export function QuickSearchLauncher() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {shortcuts.map((s) => (
        <ShortcutCard key={s.id} shortcut={s} />
      ))}
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: ShortcutConfig }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(shortcut.buildHref(trimmed));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card-bg border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <label className="text-xs font-medium text-muted uppercase tracking-wide">
        {shortcut.label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={shortcut.placeholder}
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Go
        </button>
      </div>
    </form>
  );
}
