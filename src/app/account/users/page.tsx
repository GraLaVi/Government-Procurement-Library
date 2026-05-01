"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ManagedUser, CreateUserRequest, UpdateUserRequest, AssignedProduct, AssignableItem, UserProductsResponse } from "@/lib/users/types";

// Stable composite key so we can distinguish products vs groups in
// state collections (a group with id=4 is NOT the same as a product
// with id=4).
const itemKey = (kind: "product" | "product_group", id: number): string => `${kind}:${id}`;

// Available permission roles that can be assigned
const PERMISSION_ROLES = [
  { value: "admin", label: "Admin", description: "Can manage users in the organization" },
  { value: "user", label: "User", description: "Standard user access" },
  { value: "read_only", label: "Read Only", description: "View-only access" },
];

// Helper to format role name for display
const formatRoleName = (role: string): string => {
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    user: "User",
    read_only: "Read Only",
  };
  return roleLabels[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

type ConfirmAction = "delete" | "deactivate" | "activate" | "reset-password" | null;

// Format product name for display
const formatProductName = (product: AssignedProduct): string => {
  return product.name || product.product_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format source for display
const formatProductSource = (source: string): string => {
  const sourceLabels: Record<string, string> = {
    direct: "Direct",
    group: "Product Group",
    customer_direct: "Organization",
    customer_group: "Organization Group",
    user_direct: "User Direct",
    user_group: "User Group",
  };
  return sourceLabels[source] || source;
};

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Users list state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Organization products state
  const [orgProducts, setOrgProducts] = useState<AssignableItem[]>([]);
  const [isOrgProductsExpanded, setIsOrgProductsExpanded] = useState(false);

  // Seat usage state (Phase 7c) — drives the seat counter + cap enforcement
  // when assigning seat-allocated products to team members.
  type SeatUsageRow = {
    kind: 'product' | 'product_group';
    id: number;
    name: string;
    product_key: string | null;
    requires_seat_assignment: boolean;
    used: number;
    cap: number | null;
    remaining: number | null;
  };
  const [seatUsage, setSeatUsage] = useState<SeatUsageRow[]>([]);

  // User products modal state
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedUserProducts, setSelectedUserProducts] = useState<UserProductsResponse | null>(null);
  const [selectedUserForProducts, setSelectedUserForProducts] = useState<ManagedUser | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Manage products modal state
  const [isManageProductsModalOpen, setIsManageProductsModalOpen] = useState(false);
  const [manageProductsUser, setManageProductsUser] = useState<ManagedUser | null>(null);
  // Composite-keyed set: `${kind}:${id}` so products and groups don't collide.
  const [userDirectProducts, setUserDirectProducts] = useState<string[]>([]);
  const [isSavingProducts, setIsSavingProducts] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmUser, setConfirmUser] = useState<ManagedUser | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Temporary password display
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordUser, setTempPasswordUser] = useState<string | null>(null);

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = showInactive ? "/api/users?include_inactive=true" : "/api/users";
      const response = await fetch(url, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch users");
        return;
      }

      setUsers(data);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  // Fetch organization products
  const fetchOrgProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/users/organization/products", {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok) {
        setOrgProducts(data);
      }
    } catch {
      // Silently fail - products are supplementary info
      console.error("Failed to fetch organization products");
    }
  }, []);

  // Fetch seat usage (Phase 7c) — used by the manage-products modal to
  // disable Assign when at capacity, and by the summary panel.
  const fetchSeatUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/seat-usage", { credentials: 'include' });
      if (response.ok) {
        setSeatUsage(await response.json());
      }
    } catch {
      // Soft-fail — seat info is informational; the rest of the page still works.
    }
  }, []);

  // Fetch user products
  const fetchUserProducts = async (targetUser: ManagedUser) => {
    setSelectedUserForProducts(targetUser);
    setIsProductsModalOpen(true);
    setIsLoadingProducts(true);
    setSelectedUserProducts(null);

    try {
      const response = await fetch(`/api/users/${targetUser.id}/products`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok) {
        setSelectedUserProducts(data);
      } else {
        setError(data.error || "Failed to fetch user products");
      }
    } catch {
      setError("Failed to fetch user products");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Open manage products modal
  const openManageProductsModal = async (targetUser: ManagedUser) => {
    setManageProductsUser(targetUser);
    setIsManageProductsModalOpen(true);
    setIsProductsModalOpen(false);

    // Fetch direct items (products + groups) for this user
    try {
      const response = await fetch(`/api/users/${targetUser.id}/products/direct`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setUserDirectProducts(
          (data as AssignableItem[]).map((it) => itemKey(it.kind ?? "product", it.id)),
        );
      }
    } catch {
      setUserDirectProducts([]);
    }
  };

  // Dispatch on kind so we hit the right endpoint. Products go to
  // /products/{id}, groups go to /product-groups/{id}. Trying to assign
  // an individual product when the customer's subscription is for a
  // GROUP fails the seat-cap check (no subscription FK match), which
  // surfaces as the "no active subscription with available seats" error.
  const itemPath = (
    item: { kind: "product" | "product_group"; id: number },
    userId: number,
  ): string =>
    item.kind === "product_group"
      ? `/api/users/${userId}/product-groups/${item.id}`
      : `/api/users/${userId}/products/${item.id}`;

  const handleAssignItem = async (item: AssignableItem) => {
    if (!manageProductsUser) return;

    setIsSavingProducts(true);
    try {
      const response = await fetch(itemPath(item, manageProductsUser.id), {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUserDirectProducts((prev) => [...prev, itemKey(item.kind, item.id)]);
        setSuccess(item.kind === "product_group" ? "Group assigned successfully" : "Product assigned successfully");
        fetchSeatUsage();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to assign");
      }
    } catch {
      setError("Failed to assign");
    } finally {
      setIsSavingProducts(false);
    }
  };

  const handleRemoveItem = async (item: AssignableItem) => {
    if (!manageProductsUser) return;

    setIsSavingProducts(true);
    try {
      const response = await fetch(itemPath(item, manageProductsUser.id), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok || response.status === 204) {
        setUserDirectProducts((prev) => prev.filter((k) => k !== itemKey(item.kind, item.id)));
        setSuccess(item.kind === "product_group" ? "Group removed successfully" : "Product removed successfully");
        fetchSeatUsage();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to remove");
      }
    } catch {
      setError("Failed to remove");
    } finally {
      setIsSavingProducts(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!authLoading && user) {
      if (!user.roles?.includes("admin")) {
        router.push("/account");
        return;
      }
      fetchUsers();
      fetchOrgProducts();
      fetchSeatUsage();
    }
  }, [authLoading, user, router, fetchUsers, fetchOrgProducts, fetchSeatUsage]);

  // Close menus when clicking outside, scrolling, or resizing
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

  // Toggle menu with position tracking
  const toggleMenu = (userId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48 (menu width)
      });
      setOpenMenuId(userId);
    }
  };

  // Clear success message after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle user actions
  const handleAction = async () => {
    if (!confirmUser || !confirmAction) return;

    setIsActionLoading(true);
    setError(null);

    try {
      let url = "";
      let method = "POST";

      switch (confirmAction) {
        case "delete":
          url = `/api/users/${confirmUser.id}`;
          method = "DELETE";
          break;
        case "deactivate":
          url = `/api/users/${confirmUser.id}/deactivate`;
          break;
        case "activate":
          url = `/api/users/${confirmUser.id}/activate`;
          break;
        case "reset-password":
          url = `/api/users/${confirmUser.id}/reset-password`;
          break;
      }

      const response = await fetch(url, { method });
      const data = method === "DELETE" && response.status === 204
        ? {}
        : await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to ${confirmAction} user`);
        return;
      }

      // Show temporary password if reset
      if (confirmAction === "reset-password" && data.temporary_password) {
        setTempPassword(data.temporary_password);
        setTempPasswordUser(confirmUser.email);
      }

      const actionMessages: Record<string, string> = {
        delete: `User ${confirmUser.email} has been deleted`,
        deactivate: `User ${confirmUser.email} has been deactivated`,
        activate: `User ${confirmUser.email} has been activated`,
        "reset-password": `Password reset for ${confirmUser.email}`,
      };
      setSuccess(actionMessages[confirmAction]);

      // Refresh user list
      await fetchUsers();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
      setConfirmUser(null);
    }
  };

  const openConfirmDialog = (action: ConfirmAction, targetUser: ManagedUser) => {
    setConfirmAction(action);
    setConfirmUser(targetUser);
    setOpenMenuId(null);
  };

  const openEditModal = (targetUser: ManagedUser) => {
    setSelectedUser(targetUser);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  // Loading state
  if (authLoading || (isLoading && users.length === 0)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading users...</p>
        </div>
      </div>
    );
  }

  // Non-admin redirect handled in useEffect
  if (!user || !user.roles?.includes("admin")) {
    return null;
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
          <li className="text-foreground font-medium">Manage Users</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Manage Users</h1>
          <p className="text-muted mt-1">
            Add, edit, and manage team members in your organization
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </Button>
      </div>

      {/* Seat Allocations Summary (Phase 7c) */}
      {seatUsage.length > 0 && (
        <div className="mb-6 bg-card-bg rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Seat Allocations</h3>
              <p className="text-xs text-muted">Per-user seats your team has used vs. purchased.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {seatUsage.map((row) => {
              const atCap = row.cap !== null && row.cap > 0 && row.used >= row.cap;
              const noSub = row.requires_seat_assignment && (row.cap === null || row.cap === 0);
              const pct = row.cap && row.cap > 0 ? Math.min(100, (row.used / row.cap) * 100) : 0;
              return (
                <div
                  key={`${row.kind}-${row.id}`}
                  className={`p-3 rounded-lg border ${atCap || noSub
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border bg-muted-light/30'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-foreground truncate">{row.name}</div>
                    {row.requires_seat_assignment ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                        seat-allocated
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted-light text-muted border border-border whitespace-nowrap">
                        org-wide
                      </span>
                    )}
                  </div>
                  {row.requires_seat_assignment ? (
                    <>
                      <div className="text-xs text-muted mt-1">
                        {noSub ? (
                          <span className="text-error">No active subscription — assignments blocked</span>
                        ) : (
                          <>
                            <span className={atCap ? 'text-warning font-medium' : ''}>
                              {row.used} / {row.cap} seats used
                            </span>
                            {row.remaining !== null && row.remaining > 0 && (
                              <span className="ml-1 text-muted">({row.remaining} available)</span>
                            )}
                          </>
                        )}
                      </div>
                      {row.cap !== null && row.cap > 0 && (
                        <div className="mt-1.5 h-1 bg-muted-light rounded-full overflow-hidden">
                          <div
                            className={`h-full ${atCap ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-muted mt-1">
                      All team members get access automatically
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Organization Products Section */}
      {orgProducts.length > 0 && (
        <div className="mb-6 bg-card-bg rounded-xl border border-border">
          <button
            onClick={() => setIsOrgProductsExpanded(!isOrgProductsExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted-light/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Organization Products</h3>
                <p className="text-xs text-muted">{orgProducts.length} product{orgProducts.length !== 1 ? 's' : ''} assigned to your organization</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-muted transition-transform ${isOrgProductsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOrgProductsExpanded && (
            <div className="px-6 pb-4 border-t border-border">
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {orgProducts.map((item) => (
                  <div
                    key={itemKey(item.kind, item.id)}
                    className="flex items-start gap-3 p-3 bg-muted-light/50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.kind === "product_group" ? "Bundle" : "Product"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-success">{success}</p>
          </div>
        </div>
      )}

      {/* Temporary password display */}
      {tempPassword && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-warning">Temporary Password for {tempPasswordUser}</p>
              <p className="text-sm text-foreground mt-1 font-mono bg-card-bg px-2 py-1 rounded border border-border inline-block">
                {tempPassword}
              </p>
              <p className="text-xs text-muted mt-2">
                Copy this password now. It will not be shown again.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setTempPassword(null);
                  setTempPasswordUser(null);
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Include inactive users
        </label>
      </div>

      {/* Users table */}
      <div className="bg-card-bg rounded-xl border border-border">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-muted-light border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted-light/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary uppercase">
                            {u.first_name?.[0] || u.email[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {u.first_name} {u.last_name}
                          </p>
                          {u.job_title && (
                            <p className="text-xs text-muted">{u.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === "admin" ? "info" : "default"}
                            >
                              {formatRoleName(role)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_active ? "success" : "warning"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Menu always opens — even on the current user's own row.
                          Self-targeted destructive actions (Deactivate, Delete)
                          are filtered out inside the menu rendering. The
                          previous `disabled={u.id === user.id}` blocked safe
                          self-actions like Manage Products, leaving customer
                          admins unable to assign themselves to their own paid
                          plan. */}
                      <button
                        onClick={(e) => toggleMenu(u.id, e)}
                        className="p-2 text-muted hover:text-foreground hover:bg-muted-light rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed position dropdown menu (rendered outside table to avoid overflow clipping) */}
      {openMenuId && menuPosition && (
        <div
          ref={menuRef}
          className="fixed w-48 bg-card-bg rounded-lg shadow-xl border border-border py-1 z-50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {(() => {
            const targetUser = users.find((u) => u.id === openMenuId);
            if (!targetUser) return null;
            // Customer admins can manage their own products, edit their
            // profile, reset their password — but cannot deactivate or
            // delete themselves (would lock them out of the org).
            const isSelf = targetUser.id === user.id;
            return (
              <>
                <button
                  onClick={() => openEditModal(targetUser)}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-light transition-colors"
                >
                  Edit User
                </button>
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    fetchUserProducts(targetUser);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-light transition-colors"
                >
                  View Products
                </button>
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    openManageProductsModal(targetUser);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-light transition-colors"
                >
                  Manage Products
                </button>
                <button
                  onClick={() => openConfirmDialog("reset-password", targetUser)}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-light transition-colors"
                >
                  Reset Password
                </button>
                {!isSelf && (
                  targetUser.is_active ? (
                    <button
                      onClick={() => openConfirmDialog("deactivate", targetUser)}
                      className="w-full text-left px-4 py-2 text-sm text-warning hover:bg-muted-light transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => openConfirmDialog("activate", targetUser)}
                      className="w-full text-left px-4 py-2 text-sm text-success hover:bg-muted-light transition-colors"
                    >
                      Activate
                    </button>
                  )
                )}
                {!isSelf && (
                  <>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => openConfirmDialog("delete", targetUser)}
                      className="w-full text-left px-4 py-2 text-sm text-error hover:bg-muted-light transition-colors"
                    >
                      Delete User
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(password, email) => {
          setSuccess(`User ${email} created successfully`);
          if (password) {
            setTempPassword(password);
            setTempPasswordUser(email);
          }
          fetchUsers();
        }}
        onError={setError}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUserId={user.id}
        onSuccess={() => {
          setSuccess("User updated successfully");
          fetchUsers();
        }}
        onError={setError}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === "delete"}
        onClose={() => {
          setConfirmAction(null);
          setConfirmUser(null);
        }}
        onConfirm={handleAction}
        title="Delete User"
        message={`Are you sure you want to delete ${confirmUser?.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        requireConfirmText="DELETE"
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        isOpen={confirmAction === "deactivate"}
        onClose={() => {
          setConfirmAction(null);
          setConfirmUser(null);
        }}
        onConfirm={handleAction}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${confirmUser?.email}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        isOpen={confirmAction === "activate"}
        onClose={() => {
          setConfirmAction(null);
          setConfirmUser(null);
        }}
        onConfirm={handleAction}
        title="Activate User"
        message={`Are you sure you want to activate ${confirmUser?.email}? They will be able to log in again.`}
        confirmLabel="Activate"
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        isOpen={confirmAction === "reset-password"}
        onClose={() => {
          setConfirmAction(null);
          setConfirmUser(null);
        }}
        onConfirm={handleAction}
        title="Reset Password"
        message={`Are you sure you want to reset the password for ${confirmUser?.email}? A new temporary password will be generated.`}
        confirmLabel="Reset Password"
        isLoading={isActionLoading}
      />

      {/* User Products Modal */}
      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setSelectedUserForProducts(null);
          setSelectedUserProducts(null);
        }}
        title={`Products for ${selectedUserForProducts?.first_name} ${selectedUserForProducts?.last_name}`}
        size="lg"
      >
        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : selectedUserProducts ? (
          <div className="space-y-4">
            {selectedUserProducts.products.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <svg className="w-12 h-12 mx-auto mb-3 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p>No products assigned to this user</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted">
                  {selectedUserProducts.products.length} product{selectedUserProducts.products.length !== 1 ? 's' : ''} available
                </p>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {selectedUserProducts.products.map((product) => {
                    const source = selectedUserProducts.source[product.id.toString()] || 'unknown';
                    return (
                      <div
                        key={product.id}
                        className="flex items-start gap-3 p-4 bg-muted-light/50 rounded-lg border border-border"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{formatProductName(product)}</p>
                          {product.description && (
                            <p className="text-xs text-muted mt-0.5">{product.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={product.is_active ? "success" : "warning"} className="text-xs">
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="default" className="text-xs">
                              {formatProductSource(source)}
                            </Badge>
                            {product.category && (
                              <Badge variant="info" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <div className="flex justify-between pt-4 border-t border-border">
              <Button
                variant="primary"
                onClick={() => {
                  if (selectedUserForProducts) {
                    openManageProductsModal(selectedUserForProducts);
                  }
                }}
              >
                Manage Products
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsProductsModalOpen(false);
                  setSelectedUserForProducts(null);
                  setSelectedUserProducts(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Manage Products Modal */}
      <Modal
        isOpen={isManageProductsModalOpen}
        onClose={() => {
          setIsManageProductsModalOpen(false);
          setManageProductsUser(null);
          setUserDirectProducts([]);
        }}
        title={`Manage Products for ${manageProductsUser?.first_name} ${manageProductsUser?.last_name}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Assign or remove products for this user. Products inherited from the organization are always available to all users.
          </p>

          {orgProducts.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>No products available in your organization</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {orgProducts.map((item) => {
                const composite = itemKey(item.kind, item.id);
                const isDirectlyAssigned = userDirectProducts.includes(composite);
                // Seat-usage lookup keyed by (kind, id) so a group with id=4
                // and a product with id=4 can't shadow each other.
                const seatRow = seatUsage.find((r) => r.kind === item.kind && r.id === item.id);
                const isSeatAllocated = !!seatRow?.requires_seat_assignment;
                const noSubscription = isSeatAllocated && (seatRow?.cap === null || seatRow?.cap === 0);
                const atCapacity = isSeatAllocated
                  && seatRow?.cap !== null
                  && seatRow!.cap !== undefined
                  && seatRow!.cap > 0
                  && (seatRow!.remaining ?? 0) <= 0;
                const assignBlocked = !isDirectlyAssigned && (atCapacity || noSubscription);
                const itemLabel = item.kind === "product_group" ? "Bundle" : "Product";

                return (
                  <div
                    key={composite}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isDirectlyAssigned
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted-light/50 border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDirectlyAssigned ? 'bg-primary/20' : 'bg-muted-light'
                      }`}>
                        <svg className={`w-4 h-4 ${isDirectlyAssigned ? 'text-primary' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <Badge variant={item.kind === "product_group" ? "info" : "default"} className="text-[10px]">
                            {itemLabel}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {isDirectlyAssigned && (
                            <Badge variant="info" className="text-xs">
                              User Direct
                            </Badge>
                          )}
                          {isSeatAllocated && seatRow && seatRow.cap !== null && seatRow.cap > 0 && (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                              atCapacity
                                ? 'bg-warning/10 text-warning border border-warning/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {seatRow.used} / {seatRow.cap} seats used
                            </span>
                          )}
                          {isSeatAllocated && noSubscription && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-error/10 text-error border border-error/20">
                              No active subscription
                            </span>
                          )}
                          {seatRow && !seatRow.requires_seat_assignment && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted-light text-muted border border-border">
                              Org-wide — auto-granted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {seatRow && !seatRow.requires_seat_assignment ? (
                        // Org-wide items: every user gets access automatically;
                        // per-user assignment isn't meaningful so hide the action.
                        <span className="text-xs text-muted">—</span>
                      ) : isDirectlyAssigned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item)}
                          disabled={isSavingProducts}
                        >
                          {isSavingProducts ? 'Removing...' : 'Remove'}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAssignItem(item)}
                          disabled={isSavingProducts || assignBlocked}
                          title={
                            atCapacity
                              ? `All ${seatRow?.cap} seats are assigned. Increase seats or remove a user first.`
                              : noSubscription
                                ? 'No active subscription with available seats. Subscribe to start assigning.'
                                : ''
                          }
                        >
                          {isSavingProducts ? 'Assigning...' : (atCapacity ? 'No seats' : 'Assign')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setIsManageProductsModalOpen(false);
                setManageProductsUser(null);
                setUserDirectProducts([]);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Create User Modal Component
function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (password: string | null, email: string) => void;
  onError: (error: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setJobTitle("");
    setSelectedRole("user");
    setSendWelcomeEmail(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      onError("Please select a role");
      return;
    }

    setIsSubmitting(true);

    try {
      const body: CreateUserRequest = {
        email,
        first_name: firstName,
        last_name: lastName,
        roles: [selectedRole],
        send_welcome_email: sendWelcomeEmail,
      };
      if (phone) body.phone = phone;
      if (jobTitle) body.job_title = jobTitle;

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        onError(data.error || "Failed to create user");
        return;
      }

      resetForm();
      onClose();
      onSuccess(data.temporary_password || null, email);
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="user@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Last Name"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+1 234 567 8900"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Job Title (optional)"
            type="text"
            placeholder="Developer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Role
          </label>
          <div className="space-y-2">
            {PERMISSION_ROLES.map((role) => (
              <label
                key={role.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole === role.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted-light/50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-0.5 border-border text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{role.label}</p>
                  <p className="text-xs text-muted">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={sendWelcomeEmail}
            onChange={(e) => setSendWelcomeEmail(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
            disabled={isSubmitting}
          />
          Send welcome email with login credentials
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit User Modal Component
function EditUserModal({
  isOpen,
  onClose,
  user,
  currentUserId,
  onSuccess,
  onError,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  currentUserId: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSelf = user?.id === currentUserId;

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
      setJobTitle(user.job_title || "");
      // Take the first role if user has multiple roles (for backwards compatibility)
      setSelectedRole(user.roles?.[0] || "user");
    }
  }, [user]);

  const handleRoleChange = (role: string) => {
    // Prevent changing admin role from self
    if (isSelf && selectedRole === "admin" && role !== "admin") {
      return;
    }
    setSelectedRole(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedRole) {
      onError("Please select a role");
      return;
    }

    setIsSubmitting(true);

    try {
      const body: UpdateUserRequest = {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        job_title: jobTitle || undefined,
        roles: [selectedRole],
      };

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        onError(data.error || "Failed to update user");
        return;
      }

      onClose();
      onSuccess();
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={user?.email || ""}
          disabled
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Last Name"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+1 234 567 8900"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Job Title (optional)"
            type="text"
            placeholder="Developer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Role
          </label>
          <div className="space-y-2">
            {PERMISSION_ROLES.map((role) => {
              const isAdminRoleForSelf = isSelf && selectedRole === "admin" && role.value !== "admin";
              return (
                <label
                  key={role.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRole === role.value
                      ? 'border-primary bg-primary/5'
                      : isAdminRoleForSelf
                        ? "border-border bg-muted-light/30 cursor-not-allowed"
                        : "border-border hover:bg-muted-light/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="edit-role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="mt-0.5 border-border text-primary focus:ring-primary"
                    disabled={isSubmitting || isAdminRoleForSelf}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{role.label}</p>
                    <p className="text-xs text-muted">{role.description}</p>
                    {isSelf && selectedRole === "admin" && role.value === "admin" && (
                      <p className="text-xs text-warning mt-1">Cannot change your own admin role</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
