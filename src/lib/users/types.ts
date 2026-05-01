// User management types for admin operations

// Base role types (admin, user, read_only are permission roles)
export type PermissionRole = 'admin' | 'user' | 'read_only';

// Extended user type with all fields from the API
export interface ManagedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  job_title: string | null;
  roles: string[];  // Array of roles from customer_user_roles table
  is_active: boolean;
  email_verified: boolean;
  email_verified_at: string | null;
  must_change_password: boolean;
  last_login: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  customer_id: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_type: string | null;
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

// Catalog item shown by the manage-products modal on /account/users.
// `kind` distinguishes a standalone product from a product group so the
// frontend can hit the right assignment endpoint. The customer's
// subscription FK determines which kind it really is — assigning the
// individual constituent products of a group would fail seat-cap because
// the subscription is for the group, not its members.
export interface AssignableItem {
  kind: "product" | "product_group";
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  requires_seat_assignment?: boolean;
  // Either product_key (for kind='product') or group_key (for kind='product_group').
  product_key?: string;
  group_key?: string;
  category?: string | null;
  source?: string;
}

// Response type for user products
export interface UserProductsResponse {
  products: AssignedProduct[];
  source: Record<string, string>;  // product_id -> source
}
