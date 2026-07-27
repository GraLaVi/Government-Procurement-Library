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
import { ManagedUser, CreateUserRequest, UpdateUserRequest, AssignableItem } from "@/lib/users/types";
import { resolveOrgTier } from "@/lib/library/tier";

// Available permission roles that can be assigned. The "read_only"
// permission isn't actually wired anywhere on the backend, so it's not
// exposed in the customer UI — admins can grant Admin or User only.
const PERMISSION_ROLES = [
  { value: "admin", label: "Admin", description: "Can manage users in the organization" },
  { value: "user", label: "User", description: "Standard user access" },
];

// Helper to format role name for display
const formatRoleName = (role: string): string => {
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    user: "User",
  };
  return roleLabels[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

type ConfirmAction = "delete" | "deactivate" | "activate" | "reset-password" | null;

export default function UsersPage() {
  const { user, isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const router = useRouter();
  // Paid plans buy more capacity by adding a seat (Billing → Change seats);
  // Free customers add capacity by subscribing (upgrade on /pricing). This
  // decides which action the "at cap" CTA offers.
  const onPaidPlan = hasAnyProductAccess([
    "library_search_basic",
    "library_search_advanced",
    "library_search_maximum",
  ]);

  // Users list state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Organization products state. Fetched so we can derive the org's single
  // subscription tier (Free / Basic / Advanced) for the users table.
  const [orgProducts, setOrgProducts] = useState<AssignableItem[]>([]);
  const orgTier = resolveOrgTier(orgProducts);

  // RFQ is a standalone, per-seat add-on (not a library tier) — unlike the
  // org-wide tiers above, access must be explicitly assigned to named users.
  // Only shown when the org actually holds the product.
  const rfqProduct = orgProducts.find(
    (p) => p.kind === "product" && p.product_key === "request_for_quote"
  ) ?? null;
  const [rfqSeatUsage, setRfqSeatUsage] = useState<{ used: number; cap: number | null } | null>(null);
  // userId -> source ('user_direct' = individually assigned seat;
  // 'customer_direct'/'customer_group' = org-wide comp/admin grant, not
  // seat-gated and not toggleable here).
  const [rfqAssignments, setRfqAssignments] = useState<Record<number, string>>({});
  const [rfqTogglingUserId, setRfqTogglingUserId] = useState<number | null>(null);

  // Org-level user-cap from feature_limits.max_customer_users (or
  // seat_quantity on an active library subscription). Drives the
  // "X / Y users" pill and disables the Add User button at cap.
  // `cap: null` = uncapped (Advanced or no library tier at all).
  const [userCap, setUserCap] = useState<{ used: number; cap: number | null } | null>(null);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Shown when the admin tries to add a user but all seats are in use, so the
  // "+ Add User" button never silently no-ops — it explains the next step.
  const [showSeatCapNotice, setShowSeatCapNotice] = useState(false);
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

  // Fetch the org-level user cap (active customer_users count vs.
  // feature_limits.max_customer_users). Re-fetched after create / delete
  // so the pill and the Add User button reflect the new state.
  const fetchUserCap = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/user-cap", { credentials: 'include' });
      if (response.ok) {
        setUserCap(await response.json());
      }
    } catch {
      // Soft-fail — the backend still enforces the cap on POST /users.
    }
  }, []);

  // Fetch RFQ seat usage (used/cap out of the customer's purchased RFQ
  // seats). Filtered client-side from the shared per-product seat-usage
  // list — same endpoint the org-wide seat pill would use for other
  // seat-required products.
  const fetchRfqSeatUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/seat-usage", { credentials: 'include' });
      if (response.ok) {
        const data: Array<{ product_key: string; used: number; cap: number | null }> = await response.json();
        const rfq = data.find((row) => row.product_key === "request_for_quote");
        setRfqSeatUsage(rfq ? { used: rfq.used, cap: rfq.cap } : null);
      }
    } catch {
      // Soft-fail — the backend still enforces the cap on assign.
    }
  }, []);

  // Fetch which of the currently-listed users hold the RFQ seat, and how
  // (individually assigned vs. an org-wide comp/admin grant). N+1 by
  // design — mirrors the equivalent internal-staff dashboard UI, and org
  // sizes here are small.
  const fetchRfqAssignments = useCallback(async (forUsers: ManagedUser[]) => {
    if (!rfqProduct) {
      setRfqAssignments({});
      return;
    }
    try {
      const entries = await Promise.all(
        forUsers.filter((u) => u.is_active).map(async (u) => {
          const response = await fetch(`/api/users/${u.id}/products`, { credentials: 'include' });
          if (!response.ok) return [u.id, undefined] as const;
          const data: { source: Record<string, string> } = await response.json();
          return [u.id, data.source?.[String(rfqProduct.id)]] as const;
        })
      );
      setRfqAssignments(
        Object.fromEntries(entries.filter((e): e is [number, string] => Boolean(e[1])))
      );
    } catch {
      // Soft-fail — RFQ column just shows nothing assigned until retried.
    }
  }, [rfqProduct]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading && user) {
      if (!user.roles?.includes("admin")) {
        router.push("/account");
        return;
      }
      fetchUsers();
      fetchOrgProducts();
      fetchUserCap();
      fetchRfqSeatUsage();
    }
  }, [authLoading, user, router, fetchUsers, fetchOrgProducts, fetchUserCap, fetchRfqSeatUsage]);

  // Once the org's products are known (so we know whether RFQ is held) and
  // the user list has loaded, fetch per-user RFQ assignment state.
  useEffect(() => {
    if (rfqProduct && users.length > 0) {
      fetchRfqAssignments(users);
    }
  }, [rfqProduct, users, fetchRfqAssignments]);

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

      // Refresh user list + user-cap pill (delete/deactivate/activate
      // all change the active count).
      await fetchUsers();
      fetchUserCap();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
      setConfirmUser(null);
    }
  };

  // Assign/unassign the RFQ seat for a single user. Org-wide grants
  // (customer_direct/customer_group — comp/admin) aren't toggled here; only
  // individually-assigned seats (user_direct) are.
  const toggleRfqSeat = async (targetUser: ManagedUser) => {
    if (!rfqProduct) return;
    const isAssigned = rfqAssignments[targetUser.id] === "user_direct";

    setError(null);
    setRfqTogglingUserId(targetUser.id);
    try {
      const response = await fetch(`/api/users/${targetUser.id}/products/${rfqProduct.id}`, {
        method: isAssigned ? "DELETE" : "POST",
      });

      if (!isAssigned || response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || `Failed to ${isAssigned ? "unassign" : "assign"} RFQ seat`);
          return;
        }
      }

      await Promise.all([fetchRfqAssignments(users), fetchRfqSeatUsage()]);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setRfqTogglingUserId(null);
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

  const hasSeatCap = userCap !== null && userCap.cap !== null;
  const atSeatCap = hasSeatCap && userCap!.used >= (userCap!.cap as number);

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

      {/* Page header. Seat usage is a compact badge next to the subtitle so
          the header stays clean at a glance; at cap, a dedicated banner below
          (matching the success/warning banner style used elsewhere on this
          page) carries the actual CTA instead of a bare text link. The Add
          User button stays clickable at cap and opens an advisory dialog
          rather than silently no-op'ing. */}
      {(() => {
        const capCtaHref = onPaidPlan ? "/account/billing?action=add-seat" : "/pricing";
        const capCtaLabel = onPaidPlan ? "Add a seat" : "See plans";
        return (
          <>
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary">Manage Users</h1>
                <p className="text-muted mt-1">
                  Add, edit, and manage team members in your organization
                </p>
                {(hasSeatCap || (rfqProduct && rfqSeatUsage)) && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {hasSeatCap && (
                      <Badge variant={atSeatCap ? "warning" : "info"} size="sm">
                        {userCap!.used}/{userCap!.cap} seats
                      </Badge>
                    )}
                    {rfqProduct && rfqSeatUsage && (
                      rfqSeatUsage.cap === null || rfqSeatUsage.cap === 0 ? (
                        <Badge variant="warning" size="sm">RFQ: no active subscription</Badge>
                      ) : (
                        <Badge
                          variant={rfqSeatUsage.used >= rfqSeatUsage.cap ? "warning" : "info"}
                          size="sm"
                        >
                          {rfqSeatUsage.used}/{rfqSeatUsage.cap} RFQ seats
                        </Badge>
                      )
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => (atSeatCap ? setShowSeatCapNotice(true) : setIsCreateModalOpen(true))}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </Button>
            </div>

            {atSeatCap && (
              <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-sm font-medium text-warning">
                    You&apos;re using all {userCap!.cap} seat{userCap!.cap === 1 ? "" : "s"} on your plan.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(capCtaHref)}>
                  {capCtaLabel}
                </Button>
              </div>
            )}
          </>
        );
      })()}

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
                  Plan
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Status
                </th>
                {rfqProduct && (
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    RFQ
                  </th>
                )}
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={rfqProduct ? 7 : 6} className="px-6 py-8 text-center text-muted">
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
                      {/* Single org-wide tier per the locked pricing model.
                          Inactive users hold no seat, so they show no plan. */}
                      {u.is_active ? (
                        <Badge variant={orgTier.variant}>{orgTier.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_active ? "success" : "warning"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {rfqProduct && (
                      <td className="px-6 py-4">
                        {!u.is_active ? (
                          <span className="text-sm text-muted">—</span>
                        ) : (
                          (() => {
                            const source = rfqAssignments[u.id];
                            if (source === "customer_direct" || source === "customer_group") {
                              return (
                                <span className="text-xs text-muted" title="Granted org-wide (comp/admin) — not an individually assigned seat">
                                  Org-wide
                                </span>
                              );
                            }
                            const isAssigned = source === "user_direct";
                            const isToggling = rfqTogglingUserId === u.id;
                            const atCap = rfqSeatUsage != null && rfqSeatUsage.cap != null && rfqSeatUsage.used >= rfqSeatUsage.cap;
                            const disabled = isToggling || (!isAssigned && atCap);
                            return (
                              <button
                                onClick={() => toggleRfqSeat(u)}
                                disabled={disabled}
                                title={!isAssigned && atCap ? "No RFQ seats available — buy more or unassign one" : undefined}
                                className={`text-xs font-medium px-2 py-1 -mx-2 rounded transition-colors ${
                                  isAssigned
                                    ? "text-success hover:text-error hover:bg-error/10"
                                    : disabled
                                      ? "text-muted cursor-not-allowed"
                                      : "text-muted hover:text-primary hover:bg-primary/10"
                                }`}
                              >
                                {isToggling ? "…" : isAssigned ? "✓ Assigned" : "Assign"}
                              </button>
                            );
                          })()
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      {/* Menu always opens — even on the current user's own row.
                          Self-targeted destructive actions (Deactivate, Delete)
                          are filtered out inside the menu rendering. */}
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
            // Customer admins can edit their own profile and reset their
            // password — but cannot deactivate or delete themselves
            // (would lock them out of the org).
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

      {/* At-cap advisory — the "+ Add User" button opens this instead of
          silently no-op'ing when every seat is in use. */}
      <ConfirmDialog
        isOpen={showSeatCapNotice}
        onClose={() => setShowSeatCapNotice(false)}
        onConfirm={() => {
          setShowSeatCapNotice(false);
          router.push(onPaidPlan ? "/account/billing?action=add-seat" : "/pricing");
        }}
        title={onPaidPlan ? "Add a seat to invite another user" : "Upgrade to add users"}
        message={
          onPaidPlan
            ? `You're using all ${userCap?.cap ?? ""} of your seats. To add another user, add a seat to your plan first — it's prorated, and during a trial the added seat is billed when your trial converts.`
            : "The Free plan includes 1 user. Upgrade to a paid plan to add your team."
        }
        confirmLabel={onPaidPlan ? "Add a seat" : "See plans"}
      />

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
          fetchUserCap();
        }}
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

    </>
  );
}

// Create User Modal Component
function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (password: string | null, email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setJobTitle("");
    setSelectedRole("user");
    setSendWelcomeEmail(true);
    setSubmitError(null);
  };

  // Clear inline errors whenever the modal is reopened so a stale message
  // from a prior attempt doesn't greet the next user.
  useEffect(() => {
    if (isOpen) setSubmitError(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedRole) {
      setSubmitError("Please select a role");
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
        setSubmitError(data.error || "Failed to create user");
        return;
      }

      resetForm();
      onClose();
      onSuccess(data.temporary_password || null, email);
    } catch {
      setSubmitError("An unexpected error occurred");
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
        {submitError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{submitError}</p>
          </div>
        )}
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
}: {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  currentUserId: number;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Clear inline errors when the modal opens or switches to a different
  // user, so a stale message doesn't carry over.
  useEffect(() => {
    if (isOpen) setSubmitError(null);
  }, [isOpen, user?.id]);

  const handleRoleChange = (role: string) => {
    // Prevent changing admin role from self
    if (isSelf && selectedRole === "admin" && role !== "admin") {
      return;
    }
    setSelectedRole(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user) return;

    if (!selectedRole) {
      setSubmitError("Please select a role");
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
        setSubmitError(data.error || "Failed to update user");
        return;
      }

      onClose();
      onSuccess();
    } catch {
      setSubmitError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{submitError}</p>
          </div>
        )}
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
