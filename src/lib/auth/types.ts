export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  customer_id: number;
  roles: string[];  // Array of roles from customer_user_roles table
  must_change_password: boolean;
  email_verified: boolean;
  email_verification_token: string | null;
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
