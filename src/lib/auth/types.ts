export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** Access-token lifetime in seconds. */
  expires_in: number;
  /** Refresh-token lifetime in seconds; used as the refresh cookie's Max-Age. */
  refresh_expires_in: number;
  must_change_password: boolean;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  job_title: string | null;
  customer_id: number;
  // Display name for the user's customer org. Resolved server-side via
  // customer_overrides.override_legal_business_name → cage_entity
  // .legal_business_name. Nullable when the CAGE isn't in the SAM extract.
  company_name?: string | null;
  roles: string[];  // Array of roles from customer_user_roles table
  is_active: boolean;
  email_verified: boolean;
  email_verified_at: string | null;
  must_change_password: boolean;
  last_login: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

// Product from /api/v1/auth/me/products
export interface Product {
  id: number;
  product_key: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

// Products response from backend
export interface UserProductsResponse {
  products: Product[];
  source: Record<string, string>;  // product_id -> source (customer_direct, user_direct, etc.)
}

export interface AuthState {
  user: User | null;
  products: Product[] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthError {
  type: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  message: string;
  retryAfter?: number;
}

export interface LoginResult {
  success: boolean;
  mustChangePassword?: boolean;
  error?: string;
  retryAfter?: number;
}
