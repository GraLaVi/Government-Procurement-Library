"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UploadTab } from "@/components/inventory/UploadTab";
import { ItemsTab } from "@/components/inventory/ItemsTab";
import { HistoryTab } from "@/components/inventory/HistoryTab";
import { SettingsTab } from "@/components/inventory/SettingsTab";

type TabId = "upload" | "items" | "history" | "settings";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "items", label: "Items" },
  { id: "history", label: "Upload history" },
  { id: "settings", label: "Sharing settings" },
];

export default function InventoryPage() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  // Bumped when an upload is confirmed so the history tab refetches on switch.
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  if (isLoading || !user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted mt-1">
          Upload your stock so it appears on the parts your team researches —
          and, if you choose to share it, on the parts every GPH subscriber
          researches. Sharing is opt-in and column-by-column; contributing also
          unlocks other suppliers&apos; network stock on any plan.
        </p>
      </div>

      <div className="border-b border-border mb-6">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "upload" && (
        <UploadTab
          isAdmin={isAdmin}
          onImportQueued={() => {
            setHistoryRefreshKey((k) => k + 1);
            setActiveTab("history");
          }}
        />
      )}
      {activeTab === "items" && <ItemsTab isAdmin={isAdmin} />}
      {activeTab === "history" && <HistoryTab isAdmin={isAdmin} refreshKey={historyRefreshKey} />}
      {activeTab === "settings" && <SettingsTab isAdmin={isAdmin} />}
    </div>
  );
}
