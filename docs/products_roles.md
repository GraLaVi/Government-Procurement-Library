# Products and Roles System for Sign-In and Authorization

## Overview

This document describes the products and roles system implemented for customer user authentication and authorization. The system separates **permissions** (roles) from **feature access** (products), allowing fine-grained control over what features users can access after signing in.

## Architecture

### Two-Level System

1. **Roles** (`customer_user_roles` table): Permission levels that control what actions users can perform
   - `admin`: Full administrative access within the customer organization
   - `user`: Standard user access
   - `read_only`: Read-only access

2. **Products** (`products` table): Features/services that users can access
   - Examples: `library_vendor_search`, `library_parts_search`, `reports`, `analytics`
   - Products can be assigned at both customer and user levels
   - Product groups allow bundling multiple products together

### Key Design Principles

- **Roles = Permissions**: Control what actions users can perform (CRUD operations, user management, etc.)
- **Products = Features**: Control what features/pages users can access
- **Two-Level Assignment**: Products can be assigned at customer level (inherited by all users) or user level (override/add)
- **Inheritance**: Users inherit customer-level products but can have additional/override access at the user level
- **Single Role Per User**: Each user should have exactly one role assigned (admin, user, or read_only)

## Database Schema

### Roles System

#### `customer_user_roles` Table
Stores multiple roles per user (replaces legacy single `role` field in `customer_users`).

```sql
CREATE TABLE customer_user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    assigned_by_type VARCHAR(20) CHECK (assigned_by_type IN ('internal', 'customer_admin')),
    UNIQUE(user_id, role)
);
```

**Key Points:**
- Users should have exactly one role (though the database supports multiple for backwards compatibility)
- Roles are stored as strings: `'admin'`, `'user'`, `'read_only'`
- The `customer_users.role` field is legacy and deprecated
- The frontend enforces single role selection via radio buttons

#### Accessing User Roles

The `CustomerUser` model has a `roles` property that returns a list of role names:

```python
user.roles  # Returns: ['admin', 'user']
```

### Products System

#### Core Tables

**`products` Table**
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'library_vendor_search'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),  -- 'feature', 'service', 'report', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**`product_groups` Table**
```sql
CREATE TABLE product_groups (
    id SERIAL PRIMARY KEY,
    group_key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'enterprise_package'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**`product_group_products` Table** (Junction)
Links products to product groups.

#### Assignment Tables

**Customer-Level Assignments:**
- `customer_products`: Direct product assignments to customers
- `customer_product_groups`: Product group assignments to customers

**User-Level Assignments:**
- `customer_user_products`: Direct product assignments to users (overrides/adds to customer level)
- `customer_user_product_groups`: Product group assignments to users

## Product Access Resolution

### Resolution Logic

When determining a user's effective products, the system follows this hierarchy:

1. **Customer-level direct products** (from `customer_products`)
2. **Customer-level product groups** (expand groups to products from `product_group_products`)
3. **User-level direct products** (from `customer_user_products`) - can override/add
4. **User-level product groups** (expand groups to products)

**Final set** = Union of all products (user-level takes precedence if there are conflicts)

### Example

- Customer has: `library_vendor_search` (direct) + `enterprise_package` group (includes 5 products)
- User has: `library_parts_search` (direct override)
- **User's final access**: All 5 products from enterprise_package + library_vendor_search + library_parts_search

## API Endpoints for Sign-In

### Authentication Endpoints

#### 1. Customer User Login
```
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["user"],
    "customer_id": 1,
    "is_active": true,
    "email_verified": true
  }
}
```

**Key Fields:**
- `access_token`: JWT token for API authentication
- `refresh_token`: Token for refreshing the access token
- `user.roles`: Array of role strings (e.g., `["admin", "user"]`)

#### 2. Get Current User Profile
```
GET /api/v1/auth/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": 1,
  "customer_id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "job_title": "Manager",
  "roles": ["user"],
  "is_active": true,
  "email_verified": true,
  "must_change_password": false,
  "last_login": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 3. Get Current User's Products
```
GET /api/v1/auth/me/products
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "product_key": "library_vendor_search",
      "name": "Library Vendor Search",
      "description": "Search vendor information",
      "category": "feature",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "product_key": "library_parts_search",
      "name": "Library Parts Search",
      "description": "Search parts information",
      "category": "feature",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "source": {
    "1": "customer_direct",
    "2": "user_direct"
  }
}
```

**Response Fields:**
- `products`: Array of product objects the user has access to
- `source`: Object mapping product IDs to their source:
  - `"customer_direct"`: Assigned directly to customer
  - `"customer_group"`: Inherited from customer product group
  - `"user_direct"`: Assigned directly to user
  - `"user_group"`: Inherited from user product group

**Use Cases:**
- Determine which features/pages to show in the UI
- Check if user has access to a specific feature before allowing access
- Display product access information to the user

#### 4. Refresh Access Token
```
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

#### 5. Logout
```
POST /api/v1/auth/logout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

Revokes the refresh token and logs the user out.

## Customer Admin API Endpoints

Customer admin users can manage users and products within their organization. These endpoints require admin role.

### User Management Endpoints

#### 1. List Organization Users
```
GET /api/v1/users
GET /api/v1/users?include_inactive=true
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "customer_id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "job_title": "Manager",
    "roles": ["user"],
    "is_active": true,
    "email_verified": true,
    "must_change_password": false,
    "last_login": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### 2. Create User
```
POST /api/v1/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+1234567890",
  "job_title": "Developer",
  "roles": ["user"],
  "send_welcome_email": true
}
```

**Response:**
```json
{
  "id": 2,
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "temporary_password": "TempPass123!"
}
```

**Note:** Users should have exactly one role assigned. The frontend enforces this with radio button selection.

#### 3. Update User
```
PUT /api/v1/users/{user_id}
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+1234567890",
  "job_title": "Senior Developer",
  "roles": ["admin"]
}
```

**Restrictions:**
- Admins cannot remove admin role from themselves
- Admins cannot deactivate themselves

### Organization Products Endpoints

#### 1. Get Organization Products
```
GET /api/v1/users/organization/products
```

Returns all products assigned to the customer organization (both directly and via product groups).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "product_key": "library_vendor_search",
    "name": "Library Vendor Search",
    "description": "Search vendor information",
    "category": "feature",
    "is_active": true,
    "source": "direct"
  },
  {
    "id": 2,
    "product_key": "library_parts_search",
    "name": "Library Parts Search",
    "description": "Search parts information",
    "category": "feature",
    "is_active": true,
    "source": "group"
  }
]
```

**Source Values:**
- `direct`: Product assigned directly to customer
- `group`: Product inherited from a product group assigned to customer

### User Product Management Endpoints

#### 1. Get User's Effective Products
```
GET /api/v1/users/{user_id}/products
```

Returns all products a user has access to, including inherited customer products and directly assigned user products.

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "product_key": "library_vendor_search",
      "name": "Library Vendor Search",
      "description": "Search vendor information",
      "category": "feature",
      "is_active": true
    }
  ],
  "source": {
    "1": "customer_direct"
  }
}
```

**Source Values:**
- `customer_direct`: Inherited from customer direct assignment
- `customer_group`: Inherited from customer product group
- `user_direct`: Assigned directly to user
- `user_group`: Inherited from user product group

#### 2. Get User's Direct Products
```
GET /api/v1/users/{user_id}/products/direct
```

Returns only products directly assigned to the user (not inherited from customer).

**Response:**
```json
[
  {
    "id": 3,
    "product_key": "reports",
    "name": "Reports",
    "description": "Generate reports",
    "category": "feature",
    "is_active": true
  }
]
```

#### 3. Assign Product to User
```
POST /api/v1/users/{user_id}/products/{product_id}
```

Assigns a product directly to a user. The product must be available to the organization.

**Response (201 Created):**
```json
{
  "message": "Product assigned successfully",
  "user_id": 1,
  "product_id": 3,
  "product_key": "reports",
  "product_name": "Reports"
}
```

**Errors:**
- 404: User not found or Product not found
- 400: Product not available to organization or already assigned to user

#### 4. Remove Product from User
```
DELETE /api/v1/users/{user_id}/products/{product_id}
```

Removes a direct product assignment from a user. Cannot remove inherited customer-level products.

**Response:** 204 No Content

**Errors:**
- 404: User not found or product not directly assigned to user
- Note: Products inherited from customer level cannot be removed per-user

## Frontend Integration for Sign-In

### Sign-In Flow

1. **User submits credentials** → `POST /api/v1/auth/login`
2. **Store tokens** in secure storage (localStorage, sessionStorage, or httpOnly cookies)
3. **Fetch user profile** → `GET /api/v1/auth/me` (optional, already returned in login)
4. **Fetch user products** → `GET /api/v1/auth/me/products`
5. **Store user data** in application state/context
6. **Navigate to appropriate page** based on roles/products

### Token Management

**Access Token:**
- Short-lived (typically 15-60 minutes)
- Include in `Authorization: Bearer <token>` header for all authenticated requests
- Refresh when expired using refresh token

**Refresh Token:**
- Long-lived (typically 7-30 days)
- Use to get new access tokens
- Store securely (prefer httpOnly cookies if possible)

### Checking Product Access

After sign-in, check if user has access to a specific product:

```typescript
// Example TypeScript/JavaScript
const userProducts = await fetch('/api/v1/auth/me/products', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
}).then(res => res.json());

// Check if user has access to a specific product
const hasLibraryVendorSearch = userProducts.products.some(
  p => p.product_key === 'library_vendor_search'
);

// Or create a helper function
function hasProductAccess(products: Product[], productKey: string): boolean {
  return products.some(p => p.product_key === productKey && p.is_active);
}
```

### Checking Role Access

Check if user has a specific role:

```typescript
// From login response or /api/v1/auth/me
const userRoles = user.roles; // e.g., ["admin", "user"]

// Check if user is admin
const isAdmin = userRoles.includes('admin');

// Check if user has any of multiple roles
const hasPermission = ['admin', 'user'].some(role => userRoles.includes(role));
```

### Route Protection

Protect routes based on products or roles:

```typescript
// Example: Protect route based on product access
function ProtectedRoute({ children, requiredProduct }) {
  const { userProducts } = useAuth();
  
  if (!hasProductAccess(userProducts.products, requiredProduct)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}

// Usage
<ProtectedRoute requiredProduct="library_vendor_search">
  <LibraryVendorSearchPage />
</ProtectedRoute>

// Example: Protect route based on role
function AdminRoute({ children }) {
  const { user } = useAuth();
  
  if (!user.roles.includes('admin')) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}
```

### Navigation Menu

Show/hide menu items based on product access:

```typescript
// Example: Conditionally show menu items
const menuItems = [
  {
    label: 'Vendor Search',
    path: '/library/vendor-search',
    requiredProduct: 'library_vendor_search'
  },
  {
    label: 'Parts Search',
    path: '/library/parts-search',
    requiredProduct: 'library_parts_search'
  },
  {
    label: 'Admin Panel',
    path: '/admin',
    requiredRole: 'admin'
  }
];

// Filter menu items based on user access
const visibleMenuItems = menuItems.filter(item => {
  if (item.requiredProduct) {
    return hasProductAccess(userProducts.products, item.requiredProduct);
  }
  if (item.requiredRole) {
    return user.roles.includes(item.requiredRole);
  }
  return true;
});
```

## Backend Access Control

### Checking Product Access in Backend

For protected endpoints that require specific product access:

```python
from src.products.access_control import user_has_product_access

def require_vendor_search_role(
    business_db: BusinessDbSession,
    current_user: CustomerUser = Depends(get_current_customer_user)
) -> CustomerUser:
    """
    Dependency that requires the current user to have access to 'library_vendor_search' product.
    """
    from src.products.access_control import user_has_product_access
    
    has_access = user_has_product_access(
        business_db,
        current_user.id,
        current_user.customer_id,
        'library_vendor_search'
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: library_vendor_search product required"
        )
    
    return current_user

# Usage in endpoint
@router.get("/library/vendor-search")
async def vendor_search(
    current_user: CustomerUser = Depends(require_vendor_search_role)
):
    # User has access to library_vendor_search
    ...
```

### Checking Role Access in Backend

```python
def require_admin_role(
    current_user: CustomerUser = Depends(get_current_customer_user)
) -> CustomerUser:
    """Dependency that requires admin role."""
    if 'admin' not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    return current_user
```

## Key Functions and Utilities

### Backend Functions

**`get_user_effective_products_with_source(business_db, user_id, customer_id)`**
- Returns all products user has access to with source information
- Used by `/api/v1/auth/me/products` endpoint

**`user_has_product_access(business_db, user_id, customer_id, product_key)`**
- Returns boolean indicating if user has access to a specific product
- Used for route protection

**`get_user_effective_products(business_db, user_id, customer_id)`**
- Returns set of product IDs user has access to
- Internal utility function

### Frontend Helpers

**Product Access Check:**
```typescript
function hasProductAccess(products: Product[], productKey: string): boolean {
  return products.some(p => p.product_key === productKey && p.is_active);
}
```

**Role Access Check:**
```typescript
function hasRole(roles: string[], requiredRole: string): boolean {
  return roles.includes(requiredRole);
}
```

## Migration Notes

### Legacy Role Field

The `customer_users.role` field (single string) is deprecated but still exists for backward compatibility. New code should use the `customer_user_roles` table and the `roles` property.

### Product Migration

Existing product-related roles (e.g., `library_vendor_search` as a role) have been migrated to the products system. The migration script `006_migrate_product_roles_to_products.sql` handles this conversion.

## Frontend Customer Admin Implementation

### Subscription Page

The subscription page (`/account/subscription`) displays all products assigned to the customer organization:

```
Location: /src/app/account/subscription/page.tsx
Route: /account/subscription
```

**Features:**
- Lists all products assigned to the organization
- Groups products by category
- Shows product source (direct vs product group)
- Accessible from the "Subscription" card on My Account page

### Manage Users Page

The manage users page (`/account/users`) allows customer admins to manage users:

```
Location: /src/app/account/users/page.tsx
Route: /account/users
```

**Features:**
- List all users in the organization
- Create new users with single role selection (radio buttons)
- Edit user details and role
- View/Manage user products
- Deactivate/Activate users
- Reset user passwords
- Delete users

### Role Selection UI

Users should have exactly one role. The UI enforces this with radio buttons:

```typescript
// Single role selection with radio buttons
const PERMISSION_ROLES = [
  { value: "admin", label: "Admin", description: "Can manage users in the organization" },
  { value: "user", label: "User", description: "Standard user access" },
  { value: "read_only", label: "Read Only", description: "View-only access" },
];

// In forms, use radio buttons instead of checkboxes
<input
  type="radio"
  name="role"
  value={role.value}
  checked={selectedRole === role.value}
  onChange={(e) => setSelectedRole(e.target.value)}
/>
```

**Restrictions:**
- Admins cannot change their own admin role
- Admins cannot deactivate themselves

### Product Management UI

The "Manage Products" modal allows assigning/removing products from users:

**View Products Modal:**
- Shows all effective products for a user
- Displays source (Organization, User Direct, etc.)
- "Manage Products" button opens the management modal

**Manage Products Modal:**
- Lists all organization products
- Checkboxes to assign/remove products
- Only directly assigned products can be removed
- Organization-inherited products are always available

### Frontend API Routes

The frontend proxies all API calls through Next.js API routes:

```
/api/users                              → GET /api/v1/users
/api/users                              → POST /api/v1/users
/api/users/[userId]                     → PUT /api/v1/users/{user_id}
/api/users/[userId]                     → DELETE /api/v1/users/{user_id}
/api/users/organization/products        → GET /api/v1/users/organization/products
/api/users/[userId]/products            → GET /api/v1/users/{user_id}/products
/api/users/[userId]/products/direct     → GET /api/v1/users/{user_id}/products/direct
/api/users/[userId]/products/[productId] → POST/DELETE /api/v1/users/{user_id}/products/{product_id}
```

### TypeScript Types

```typescript
// User types (src/lib/users/types.ts)
interface ManagedUser {
  id: number;
  customer_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  job_title: string | null;
  roles: string[];
  is_active: boolean;
  email_verified: boolean;
  must_change_password: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface AssignedProduct {
  id: number;
  product_key: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  source: string;
}

interface UserProductsResponse {
  products: AssignedProduct[];
  source: Record<string, string>;
}
```

## Summary

### For Sign-In Implementation

1. **Use `/api/v1/auth/login`** to authenticate users
2. **Store tokens** securely
3. **Fetch user products** via `/api/v1/auth/me/products` after login
4. **Check product access** before showing features/routes
5. **Check role access** for permission-based features
6. **Refresh tokens** when access token expires
7. **Handle logout** by revoking refresh token

### Key Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - Sign in
- `GET /api/v1/auth/me` - Get current user (includes roles)
- `GET /api/v1/auth/me/products` - Get user's accessible products
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Sign out

**Customer Admin - User Management:**
- `GET /api/v1/users` - List organization users
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

**Customer Admin - Product Management:**
- `GET /api/v1/users/organization/products` - Get organization products
- `GET /api/v1/users/{user_id}/products` - Get user's effective products
- `GET /api/v1/users/{user_id}/products/direct` - Get user's direct products
- `POST /api/v1/users/{user_id}/products/{product_id}` - Assign product to user
- `DELETE /api/v1/users/{user_id}/products/{product_id}` - Remove product from user

### Key Concepts

- **Roles** = Permissions (what actions can be performed)
- **Products** = Features (what features can be accessed)
- **Single role per user** = Each user should have exactly one role
- **Two-level assignment** = Customer-level (inherited) + User-level (override/add)
- **Product groups** = Bundles of products for easier management

