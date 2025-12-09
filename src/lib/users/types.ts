// User management types for admin operations

// Base role types (admin, user, read_only are permission roles)
export type PermissionRole = 'admin' | 'user' | 'read_only';

// Extended user type with all fields from the API
export interface ManagedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
  roles: string[];  // Array of roles from customer_user_roles table
  is_active: boolean;
  email_verified: boolean;
  customer_id: number;
  created_at: string;
}

// Request type for creating a new user
export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
  roles: string[];  // Array of roles to assign
  send_welcome_email: boolean;
}

// Response type when creating a user (includes temporary password)
export interface CreateUserResponse extends ManagedUser {
  temporary_password: string;
}

// Request type for updating a user
export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  job_title?: string;
  roles?: string[];  // Array of roles to assign
  is_active?: boolean;
}

// Response type for password reset
export interface ResetPasswordResponse {
  message: string;
  temporary_password: string;
  email_sent: boolean;
  note: string;
}

// Request type for password reset
export interface ResetPasswordRequest {
  send_password_reset_email?: boolean;
}

// Product assigned to organization or user
export interface AssignedProduct {
  id: number;
  product_key: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  source: string;  // 'direct', 'group', 'customer_direct', 'customer_group', 'user_direct', 'user_group'
}

// Response type for user products
export interface UserProductsResponse {
  products: AssignedProduct[];
  source: Record<string, string>;  // product_id -> source
}
