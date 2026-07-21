// Types for user preferences and recent actions

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  default_page?: string;
  // How vendor/part detail sections are laid out: separate tabs (default)
  // or a linear one-pager. Shared across both vendor and part detail.
  results_layout?: 'tabs' | 'linear';
  vendor_search?: {
    default_type?: string;
  };
  parts_search?: {
    default_type?: string;
  };
  [key: string]: any; // Allow additional preference keys
}

export interface UserPreferencesResponse {
  preferences: UserPreferences;
}

export interface CreateRecentActionRequest {
  action_type: string;
  action_data: Record<string, any>;
}

export interface RecentActionEntry {
  id: number;
  action_type: string;
  action_data: Record<string, any>;
  actioned_at: string; // ISO datetime string
  // Pinned rows are exempt from the rotating cleanup (Advanced-tier feature).
  // Defaults to false when omitted by older clients.
  is_pinned?: boolean;
}

export interface RecentActionsResponse {
  action_type: string;
  actions: RecentActionEntry[];
}

// Vendor search specific types
export interface VendorSearchActionData {
  query_type: string; // 'cage', 'uei', 'entity_name'
  query: string;
}

// Parts search specific types (for future use)
export interface PartsSearchActionData {
  query_type: string; // 'nsn', 'description', 'keyword', etc.
  query: string;
}


