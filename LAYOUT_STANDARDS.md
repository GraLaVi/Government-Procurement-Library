# Layout Standards & Design System

This document defines the layout patterns, UI components, and styling conventions for the GPH government procurement library frontend. Follow these standards when building new pages.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Layout Architecture](#layout-architecture)
3. [UI Components](#ui-components)
4. [Styling Patterns](#styling-patterns)
5. [API Routes](#api-routes)
6. [Authentication](#authentication)
7. [Code Examples](#code-examples)

---

## Project Structure

```
src/
├── app/
│   ├── account/           # Protected account pages
│   │   ├── layout.tsx     # Shared account layout with Header
│   │   ├── page.tsx       # Account dashboard
│   │   ├── profile/       # Profile editing
│   │   ├── users/         # User management (admin only)
│   │   └── change-password/
│   ├── api/               # Next.js API routes (proxy to FastAPI)
│   └── (public)/          # Public pages (login, etc.)
├── components/
│   ├── layout/
│   │   └── Header.tsx     # Shared header with navigation
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       └── ConfirmDialog.tsx
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
└── lib/
    └── auth/
        └── config.ts      # Auth configuration & cookie names
```

---

## Layout Architecture

### Container Width

The site uses `max-w-screen-2xl` (1536px) for main content areas to accommodate data-heavy tables:

```tsx
<main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {children}
</main>
```

### Account Layout (`/src/app/account/layout.tsx`)

All account pages use a shared layout that provides:
- Shared Header component
- Consistent container width
- Loading state handling
- Background color (`bg-muted-light`)

```tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted-light">
      <Header />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

### Header Component (`/src/components/layout/Header.tsx`)

The shared header includes:
- Logo/brand link
- Library Search dropdown menu
- User account menu with sign out

Props:
- `showAccountLink?: boolean` - Show "Account" link (hide on main account page)

---

## UI Components

### Button (`/src/components/ui/Button.tsx`)

Polymorphic button that renders as `<button>` or `<Link>` based on `href` prop.

**Variants:** `primary` | `secondary` | `outline` | `ghost`
**Sizes:** `sm` | `md` | `lg`

```tsx
// As button
<Button variant="primary" onClick={handleClick}>Submit</Button>

// As link
<Button variant="outline" href="/account">Go to Account</Button>

// With icon
<Button variant="primary">
  <svg className="w-4 h-4 mr-2">...</svg>
  Add User
</Button>
```

**Important:** When using `href`, the button renders as a `<Link>` and does NOT support `disabled` prop. Use button variant for disable functionality.

### Input (`/src/components/ui/Input.tsx`)

Styled input with label support.

```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="user@company.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  disabled={isSubmitting}
  error="Invalid email format"  // Optional error message
/>
```

### Select (`/src/components/ui/Select.tsx`)

Dropdown select matching Input styling.

```tsx
<Select
  label="Role"
  options={[
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ]}
  value={role}
  onChange={(e) => setRole(e.target.value)}
  disabled={isSubmitting}
/>
```

### Badge (`/src/components/ui/Badge.tsx`)

Status and role indicator badges.

**Variants:** `default` | `success` | `warning` | `error` | `info`

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Inactive</Badge>
<Badge variant="info">Admin</Badge>
```

### Modal (`/src/components/ui/Modal.tsx`)

Dialog modal for forms and content.

**Sizes:** `sm` | `md` | `lg` | `xl`

```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Add New User"
  size="lg"
>
  <form>...</form>
</Modal>
```

### ConfirmDialog (`/src/components/ui/ConfirmDialog.tsx`)

Confirmation dialog for destructive actions.

```tsx
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete User"
  message="Are you sure you want to delete this user? This cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  requireConfirmText="DELETE"  // Optional: require typing to confirm
  isLoading={isDeleting}
/>
```

---

## Styling Patterns

### Color Variables (Tailwind)

Defined in `tailwind.config.ts`:

| Variable | Usage |
|----------|-------|
| `primary` | Primary actions, links, focus states |
| `primary-hover` | Primary button hover |
| `primary-light` | Light primary backgrounds |
| `secondary` | Secondary brand color |
| `foreground` | Main text color |
| `muted` | Secondary/helper text |
| `muted-light` | Page backgrounds, subtle fills |
| `border` | Border color |
| `success` | Success states, active badges |
| `warning` | Warning states, inactive badges |
| `error` | Error states, destructive actions |

### Cards

Standard card styling:

```tsx
<div className="bg-white rounded-xl border border-border p-6">
  {/* Card content */}
</div>

// Card with shadow (for elevated elements)
<div className="bg-white rounded-xl border border-border shadow-sm p-6">
  {/* Card content */}
</div>
```

### Tables

```tsx
<div className="bg-white rounded-xl border border-border">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-muted-light border-b border-border">
        <tr>
          <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
            Column Header
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        <tr className="hover:bg-muted-light/50 transition-colors">
          <td className="px-6 py-4 text-sm text-foreground">
            Cell content
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Page Headers

```tsx
{/* Breadcrumb */}
<nav className="mb-6">
  <ol className="flex items-center gap-2 text-sm">
    <li>
      <Link href="/account" className="text-muted hover:text-primary transition-colors">
        Account
      </Link>
    </li>
    <li className="text-muted">/</li>
    <li className="text-foreground font-medium">Current Page</li>
  </ol>
</nav>

{/* Page header with action button */}
<div className="flex items-start justify-between mb-8">
  <div>
    <h1 className="text-2xl font-bold text-secondary">Page Title</h1>
    <p className="text-muted mt-1">Page description text</p>
  </div>
  <Button variant="primary" onClick={handleAction}>
    Action Button
  </Button>
</div>
```

### Alert Messages

```tsx
{/* Success */}
<div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
  <div className="flex items-center gap-2">
    <svg className="w-5 h-5 text-success">...</svg>
    <p className="text-sm font-medium text-success">{message}</p>
  </div>
</div>

{/* Error */}
<div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
  <p className="text-sm text-error">{error}</p>
</div>

{/* Warning */}
<div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
  <p className="text-sm text-warning">{warning}</p>
</div>
```

### Form Layout

```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  {/* Single column input */}
  <Input label="Email" ... />

  {/* Two column grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Input label="First Name" ... />
    <Input label="Last Name" ... />
  </div>

  {/* Checkbox */}
  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      className="rounded border-border text-primary focus:ring-primary"
    />
    Checkbox label text
  </label>

  {/* Form actions (in modal) */}
  <div className="flex justify-end gap-3 pt-4 border-t border-border">
    <Button variant="outline" type="button" onClick={onClose}>
      Cancel
    </Button>
    <Button variant="primary" type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : "Save"}
    </Button>
  </div>
</form>
```

### Dropdown Menus (Fixed Position)

For dropdown menus inside tables or cards with overflow, use fixed positioning:

```tsx
const [openMenuId, setOpenMenuId] = useState<number | null>(null);
const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
const menuRef = useRef<HTMLDivElement>(null);

// Toggle menu with position tracking
const toggleMenu = (id: number, event: React.MouseEvent<HTMLButtonElement>) => {
  if (openMenuId === id) {
    setOpenMenuId(null);
    setMenuPosition(null);
  } else {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.right - 192, // 192px = w-48 menu width
    });
    setOpenMenuId(id);
  }
};

// Close on outside click, scroll, resize
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpenMenuId(null);
      setMenuPosition(null);
    }
  }
  function handleScrollOrResize() {
    setOpenMenuId(null);
    setMenuPosition(null);
  }
  document.addEventListener("mousedown", handleClickOutside);
  window.addEventListener("scroll", handleScrollOrResize, true);
  window.addEventListener("resize", handleScrollOrResize);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    window.removeEventListener("scroll", handleScrollOrResize, true);
    window.removeEventListener("resize", handleScrollOrResize);
  };
}, []);

// Render menu outside the table
{openMenuId && menuPosition && (
  <div
    ref={menuRef}
    className="fixed w-48 bg-white rounded-lg shadow-xl border border-border py-1 z-50"
    style={{ top: menuPosition.top, left: menuPosition.left }}
  >
    <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-light">
      Menu Item
    </button>
  </div>
)}
```

### Loading Spinner

```tsx
<div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
```

### User Avatar Circle

```tsx
<div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
  <span className="text-sm font-semibold text-primary uppercase">
    {firstName?.[0] || email[0]}
  </span>
</div>
```

---

## API Routes

### Pattern

API routes in `/src/app/api/` proxy requests to the FastAPI backend, forwarding the auth token from cookies.

```tsx
// /src/app/api/users/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/users/`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

**Important:** FastAPI requires trailing slashes on endpoints. Always include `/` at the end:
- Correct: `/users/`
- Wrong: `/users`

### Dynamic Routes

```tsx
// /src/app/api/users/[userId]/route.ts
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // ... handle request
}
```

---

## Authentication

### Auth Context

Use `useAuth()` hook for authentication state:

```tsx
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  // user object: { id, email, first_name, last_name, role, customer_id, ... }
}
```

### Role-Based Access

```tsx
// Redirect non-admins
useEffect(() => {
  if (!authLoading && user) {
    if (user.role !== "admin") {
      router.push("/account");
    }
  }
}, [authLoading, user, router]);

// Conditional rendering
{user.role === "admin" && (
  <Link href="/account/users">Manage Users</Link>
)}
```

### Form State Pattern

Standard pattern for forms with loading, error, and success states:

```tsx
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

// Clear success after timeout
useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }
}, [success]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsSubmitting(true);

  try {
    const response = await fetch("/api/endpoint", { ... });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Request failed");
      return;
    }

    setSuccess("Operation completed successfully");
  } catch {
    setError("An unexpected error occurred");
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Code Examples

### Complete Page Template

```tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

export default function ExamplePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/data");
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to fetch data");
        return;
      }
      setData(result);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Page Title</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Page Title</h1>
          <p className="text-muted mt-1">Page description</p>
        </div>
        <Button variant="primary">Action</Button>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-sm font-medium text-success">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Main content */}
      <div className="bg-white rounded-xl border border-border p-6">
        {/* Content here */}
      </div>
    </>
  );
}
```

---

## Summary Checklist

When building a new page:

- [ ] Use `"use client"` for interactive pages
- [ ] Import and use `useAuth()` for authentication
- [ ] Pages under `/account/` automatically get the shared layout
- [ ] Use breadcrumb navigation
- [ ] Use `text-2xl font-bold text-secondary` for page titles
- [ ] Use `bg-white rounded-xl border border-border` for cards
- [ ] Use the standard form state pattern (error, success, isSubmitting)
- [ ] Use UI components from `/src/components/ui/`
- [ ] For tables with action menus, use fixed positioning pattern
- [ ] API routes should forward auth token and use trailing slashes
