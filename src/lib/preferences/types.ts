// Types for user preferences and recent actions

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  default_page?: string;
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
}

export interface RecentActionsResponse {
  action_type: string;
  actions: RecentActionEntry[];
}

// Vendor search specific types
export interface VendorSearchActionData {
  query_type: string; // 'cage', 'uei', 'duns', 'entity_name', 'contact_email'
  query: string;
}

// Parts search specific types (for future use)
export interface PartsSearchActionData {
  query_type: string; // 'nsn', 'description', 'keyword', etc.
  query: string;
}


