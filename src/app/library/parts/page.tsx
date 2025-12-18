"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";

export default function PartsSearchPage() {
  const { isLoading: authLoading, hasProductAccess } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Check if user has access to parts search
  if (!hasProductAccess("library_parts_search")) {
    return (
      <AccessDeniedPage
        featureName="Parts Search"
        featureKey="library_parts_search"
        description="Search the parts library to find National Stock Numbers (NSN), part descriptions, pricing information, and related contract data."
        benefits={[
          "Search parts by NSN, description, or keywords",
          "View pricing and availability information",
          "Find related contracts and solicitations",
          "Access comprehensive parts master data",
        ]}
      />
    );
  }

  // Basic parts search page structure (to be expanded later)
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-border p-8 text-center">
        <svg
          className="w-10 h-10 text-muted/50 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-sm font-medium text-foreground mb-1">
          Parts Search
        </h3>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Search for parts by NSN, description, or keywords. This feature is coming soon.
        </p>
      </div>
    </div>
  );
}

