"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_PRODUCT_KEY, RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Email Delivery — customer-configured outbound mail servers.
 *
 * Contract with the worker (which owns routing, verification, and the failure
 * policy):
 *   * only a `verified` connection is ever used for sending;
 *   * the verified DEFAULT for a purpose is what gets used — there is at most
 *     one per (purpose), enforced by a partial unique index;
 *   * once a connection is selected for a send there is NO fallback: a broken
 *     customer server means the email waits rather than going out from our
 *     domain under their name;
 *   * changing settings or the credential resets the row to `unverified`, so
 *     the customer must re-test. Until they do, mail goes out from the
 *     platform identity — the page says so rather than letting them assume
 *     their server is still in play.
 */

interface EmailConnection {
  id: number;
  display_name: string;
  provider_type: string;
  provider_label: string;
  purpose: string;
  purpose_label: string;
  is_default: boolean;
  config: Record<string, unknown>;
  has_secret: boolean;
  status: string;
  last_verified_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
}

interface ProviderSpec {
  provider_type: string;
  label: string;
  secret_field: string;
}

interface OptionsResponse {
  providers: ProviderSpec[];
  purposes: { value: string; label: string }[];
  max_connections: number;
}

type FormState = {
  display_name: string;
  purpose: string;
  provider_type: string;
  // smtp
  host: string;
  port: string;
  username: string;
  use_tls: boolean;
  // ms_graph
  tenant_id: string;
  client_id: string;
  save_to_sent_items: boolean;
  // shared identity
  from_email: string;
  from_name: string;
  reply_to: string;
  // the one credential — write-only, never returned by the API
  secret: string;
};

const EMPTY_FORM: FormState = {
  display_name: "",
  purpose: "rfq",
  provider_type: "smtp",
  host: "",
  port: "587",
  username: "",
  use_tls: true,
  tenant_id: "",
  client_id: "",
  save_to_sent_items: false,
  from_email: "",
  from_name: "",
  reply_to: "",
  secret: "",
};

const SECRET_LABEL: Record<string, string> = {
  smtp: "Password",
  ms_graph: "Client secret",
};

const inputClass =
  "w-full px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const labelClass = "block text-sm font-medium text-card-foreground mb-1.5";

/** FastAPI returns `detail` as a string for our errors and as an array of
 *  objects for request-schema failures. Flatten both to one line. */
function errorText(payload: unknown, fallback: string): string {
  const err = (payload as { error?: unknown })?.error;
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    const first = err[0] as { loc?: unknown[]; msg?: string } | undefined;
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  return fallback;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    verified: { label: "Verified", className: "bg-success/10 text-success border-success/20" },
    unverified: { label: "Not tested", className: "bg-warning/10 text-warning border-warning/20" },
    failing: { label: "Failing", className: "bg-error/10 text-error border-error/20" },
    disabled: { label: "Disabled", className: "bg-muted-light/40 text-muted border-border" },
  };
  const meta = map[status] || { label: status, className: "bg-muted-light/40 text-muted border-border" };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function EmailConnectionsPage() {
  const { user, isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const router = useRouter();

  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EmailConnection | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<number | null>(null);
  const [testTarget, setTestTarget] = useState<EmailConnection | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailConnection | null>(null);

  // Cancels an in-flight verification poll when the page unmounts or another
  // test starts, so a stale poll can't overwrite fresher state.
  const pollAbort = useRef<{ cancelled: boolean } | null>(null);

  const hasRfq = hasAnyProductAccess(RFQ_SENDER_KEYS);
  const isAdmin = user?.roles?.includes("admin") ?? false;

  const fetchConnections = useCallback(async (): Promise<EmailConnection[]> => {
    const response = await fetch("/api/email-connections", { credentials: "include" });
    const json = await response.json();
    if (!response.ok) throw new Error(errorText(json, "Failed to load email connections"));
    setConnections(json);
    return json as EmailConnection[];
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [, optionsResponse] = await Promise.all([
        fetchConnections(),
        fetch("/api/email-connections/options", { credentials: "include" }),
      ]);
      const optionsJson = await optionsResponse.json();
      if (optionsResponse.ok) setOptions(optionsJson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnections]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/account");
      return;
    }
    if (hasRfq) load();
    else setIsLoading(false);
  }, [authLoading, user, isAdmin, hasRfq, router, load]);

  useEffect(() => () => {
    if (pollAbort.current) pollAbort.current.cancelled = true;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const providers = options?.providers ?? [
    { provider_type: "smtp", label: "SMTP", secret_field: "password" },
    { provider_type: "ms_graph", label: "Microsoft 365 (Graph)", secret_field: "client_secret" },
  ];
  const purposes = options?.purposes ?? [{ value: "rfq", label: "RFQ" }];
  const atCapacity = options ? connections.length >= options.max_connections : false;

  // --- form ----------------------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, purpose: purposes[0]?.value || "rfq" });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (c: EmailConnection) => {
    const cfg = c.config as Record<string, string | number | boolean | undefined>;
    setEditing(c);
    setForm({
      display_name: c.display_name,
      purpose: c.purpose,
      provider_type: c.provider_type,
      host: String(cfg.host ?? ""),
      port: cfg.port !== undefined ? String(cfg.port) : "587",
      username: String(cfg.username ?? ""),
      use_tls: cfg.use_tls !== false,
      tenant_id: String(cfg.tenant_id ?? ""),
      client_id: String(cfg.client_id ?? ""),
      save_to_sent_items: cfg.save_to_sent_items === true,
      from_email: String(cfg.from_email ?? ""),
      from_name: String(cfg.from_name ?? ""),
      reply_to: String(cfg.reply_to ?? ""),
      secret: "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const buildConfig = (): Record<string, unknown> => {
    const shared: Record<string, unknown> = { from_email: form.from_email.trim() };
    if (form.from_name.trim()) shared.from_name = form.from_name.trim();
    if (form.reply_to.trim()) shared.reply_to = form.reply_to.trim();

    if (form.provider_type === "ms_graph") {
      return {
        ...shared,
        tenant_id: form.tenant_id.trim(),
        client_id: form.client_id.trim(),
        save_to_sent_items: form.save_to_sent_items,
      };
    }
    return {
      ...shared,
      host: form.host.trim(),
      port: Number(form.port),
      username: form.username.trim(),
      use_tls: form.use_tls,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.provider_type === "smtp") {
      const port = Number(form.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setFormError("Port must be a whole number between 1 and 65535.");
        return;
      }
    }
    if (!editing && !form.secret.trim()) {
      setFormError(`${SECRET_LABEL[form.provider_type] || "Credential"} is required.`);
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editing);
      const body: Record<string, unknown> = isEdit
        ? { display_name: form.display_name.trim(), config: buildConfig() }
        : {
            display_name: form.display_name.trim(),
            provider_type: form.provider_type,
            purpose: form.purpose,
            config: buildConfig(),
            secret: form.secret,
          };
      // On edit, an untouched credential field means "keep what's stored" —
      // the API never re-encrypts or nulls it when `secret` is absent.
      if (isEdit && form.secret.trim()) body.secret = form.secret;

      const response = await fetch(
        isEdit ? `/api/email-connections/${editing!.id}` : "/api/email-connections",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        setFormError(errorText(json, "Failed to save the connection"));
        return;
      }
      setShowModal(false);
      await fetchConnections();
      setToast(
        isEdit
          ? "Connection saved. Run a test to verify it before it's used for sending."
          : "Connection added. Run a test to verify it.",
      );
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  // --- row actions ---------------------------------------------------------

  const openTest = (c: EmailConnection) => {
    setTestTarget(c);
    setTestEmail(user?.email || "");
  };

  /** Poll the list until the worker stamps its verdict on the row. The task
   *  writes status/last_verified_at/last_error, so the row IS the result
   *  channel — we watch for any of the three to move off the pre-test
   *  snapshot. Comparing against a snapshot rather than just "is last_error
   *  set" matters for a connection that was already failing: its stale error
   *  would otherwise read as this run's verdict a second after dispatch. */
  const pollForVerdict = async (connectionId: number, before: EmailConnection) => {
    const token = { cancelled: false };
    if (pollAbort.current) pollAbort.current.cancelled = true;
    pollAbort.current = token;

    const snapshot = `${before.status}|${before.last_verified_at}|${before.last_error}`;

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (token.cancelled) return;
      let rows: EmailConnection[];
      try {
        rows = await fetchConnections();
      } catch {
        continue;
      }
      const row = rows.find((r) => r.id === connectionId);
      if (!row) return;
      if (`${row.status}|${row.last_verified_at}|${row.last_error}` !== snapshot) {
        setTestingId(null);
        setToast(
          row.status === "verified"
            ? "Connection verified. It can now be used for sending."
            : "The test failed — see the error on the connection below.",
        );
        return;
      }
    }
    if (!token.cancelled) {
      setTestingId(null);
      // An unchanged row after 30s means the worker hasn't written a verdict —
      // don't invent one.
      setToast("Still running. Refresh in a moment to see the result.");
    }
  };

  const runTest = async (sendTestEmail: boolean) => {
    if (!testTarget) return;
    const target = testTarget;
    setTestTarget(null);
    setTestingId(target.id);
    setError(null);
    try {
      const response = await fetch(`/api/email-connections/${target.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sendTestEmail ? { send_test_to: testEmail.trim() } : {}),
      });
      const json = await response.json();
      if (!response.ok) {
        setTestingId(null);
        setError(errorText(json, "Failed to start the connection test"));
        return;
      }
      await pollForVerdict(target.id, target);
    } catch {
      setTestingId(null);
      setError("An unexpected error occurred");
    }
  };

  const rowAction = async (
    c: EmailConnection,
    path: string,
    method: "POST" | "PUT" | "DELETE",
    body?: Record<string, unknown>,
    successMessage?: string,
  ) => {
    setBusyId(c.id);
    setError(null);
    try {
      const response = await fetch(`/api/email-connections/${c.id}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(errorText(json, "The action failed"));
        return;
      }
      await fetchConnections();
      if (successMessage) setToast(successMessage);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusyId(target.id);
    try {
      const response = await fetch(`/api/email-connections/${target.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const json = await response.json().catch(() => ({}));
        setError(errorText(json, "Failed to delete the connection"));
        return;
      }
      await fetchConnections();
      setToast(`Deleted "${target.display_name}".`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setBusyId(null);
    }
  };

  // --- render --------------------------------------------------------------

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading email settings…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  if (!hasRfq) {
    return (
      <AccessDeniedPage
        featureName="Custom Email Delivery"
        featureKey={RFQ_PRODUCT_KEY}
        description="Send RFQ emails to your vendors from your own mail server, so quotes arrive from your company's address instead of ours."
        benefits={[
          "Send from your own domain — vendors see your address, not a platform one",
          "Works with any SMTP server, or Microsoft 365 via Graph",
          "Replies land directly in your mailbox",
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-muted mb-2">
          <Link href="/account" className="hover:text-primary">
            Account
          </Link>
          {" / "}
          <span className="text-foreground">Email Delivery</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Delivery</h1>
            <p className="text-muted mt-1 max-w-3xl">
              Send RFQ email from your own mail server instead of ours, so vendors
              see your company&apos;s address. Add a server, test it, then make it the
              default for a product.
            </p>
          </div>
          <Button variant="primary" onClick={openCreate} disabled={atCapacity}>
            + Add connection
          </Button>
        </div>
      </div>

      {atCapacity && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          You&apos;ve reached the maximum of {options?.max_connections} connections.
          Delete one to add another.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {toast}
        </div>
      )}

      {connections.length === 0 ? (
        <div className="rounded-xl border border-border bg-card-bg px-6 py-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">No email server configured</h2>
          <p className="text-muted mt-1 text-sm max-w-md mx-auto">
            RFQ email currently goes out from our platform address. Add your own
            mail server to send from your company&apos;s domain instead.
          </p>
          <div className="mt-5">
            <Button variant="primary" onClick={openCreate}>
              + Add connection
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((c) => {
            const busy = busyId === c.id;
            const testing = testingId === c.id;
            const fromEmail = String((c.config as Record<string, unknown>).from_email ?? "");
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card-bg p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-card-foreground">
                        {c.display_name}
                      </h3>
                      {statusBadge(c.status)}
                      {c.is_default && (
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Default for {c.purpose_label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {c.provider_label}
                      {fromEmail && <> · {fromEmail}</>}
                      <> · {c.purpose_label}</>
                    </p>
                    {c.last_verified_at && (
                      <p className="text-xs text-muted mt-1">
                        Last verified {new Date(c.last_verified_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => openTest(c)}
                      disabled={busy || testing || c.status === "disabled"}
                      className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      {testing ? "Testing…" : "Test"}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      disabled={busy}
                      className="text-primary hover:underline disabled:opacity-40"
                    >
                      Edit
                    </button>
                    {c.is_default ? (
                      <button
                        onClick={() => rowAction(c, "/default", "DELETE", undefined, "Reverted to the platform sender.")}
                        disabled={busy}
                        className="text-primary hover:underline disabled:opacity-40"
                      >
                        Remove default
                      </button>
                    ) : (
                      <button
                        onClick={() => rowAction(c, "/default", "POST", undefined, `Now sending ${c.purpose_label} email through this connection.`)}
                        disabled={busy || c.status !== "verified"}
                        title={c.status !== "verified" ? "Test this connection successfully first" : undefined}
                        className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        Set as default
                      </button>
                    )}
                    {c.status === "disabled" ? (
                      <button
                        onClick={() => rowAction(c, "/status", "PUT", { status: "unverified" }, "Re-enabled. Test it to start sending through it again.")}
                        disabled={busy}
                        className="text-primary hover:underline disabled:opacity-40"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        onClick={() => rowAction(c, "/status", "PUT", { status: "disabled" }, "Connection disabled.")}
                        disabled={busy}
                        className="text-muted hover:underline disabled:opacity-40"
                      >
                        Disable
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(c)}
                      disabled={busy}
                      className="text-error hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {c.status === "unverified" && (
                  <p className="mt-3 text-xs text-warning bg-warning/5 border border-warning/20 rounded-md px-3 py-2">
                    Not verified yet — {c.purpose_label} email is going out from our
                    platform address until this connection passes a test.
                  </p>
                )}
                {c.status === "failing" && (
                  <p className="mt-3 text-xs text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">
                    Your server rejected {c.consecutive_failures} sends in a row, so we
                    stopped routing through it. Fix the settings and run a test to
                    resume — queued {c.purpose_label} email is waiting, not being sent
                    from our address.
                  </p>
                )}
                {c.is_default && c.status === "verified" && (
                  <p className="mt-3 text-xs text-muted">
                    All {c.purpose_label} email is sent through this server. If it stops
                    accepting mail, messages wait rather than going out from our address.
                  </p>
                )}
                {c.last_error && (
                  <div className="mt-3 rounded-md bg-error/5 border border-error/20 px-3 py-2">
                    <p className="text-[11px] font-medium text-error mb-0.5">Last error</p>
                    <p className="text-xs text-error break-words font-mono">{c.last_error}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit ------------------------------------------------------- */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit email connection" : "Add email connection"}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Quotes mailbox"
                required
                maxLength={255}
              />
              <p className="text-xs text-muted mt-1">Shown here and in any failure alerts.</p>
            </div>
            <div>
              <label className={labelClass}>Product</label>
              <select
                className={inputClass}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                disabled={Boolean(editing)}
              >
                {purposes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1">
                {editing
                  ? "The product can't be changed after a connection is created."
                  : "More products will be selectable as they gain support for custom email."}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Server type</label>
            <select
              className={inputClass}
              value={form.provider_type}
              onChange={(e) => setForm({ ...form, provider_type: e.target.value })}
              disabled={Boolean(editing)}
            >
              {providers.map((p) => (
                <option key={p.provider_type} value={p.provider_type}>
                  {p.label}
                </option>
              ))}
            </select>
            {editing ? (
              <p className="text-xs text-muted mt-1">
                Server type can&apos;t be changed — delete this connection and add a new
                one to switch.
              </p>
            ) : form.provider_type === "smtp" ? (
              <p className="text-xs text-muted mt-1">
                On Microsoft 365? Choose Microsoft 365 (Graph) instead — Microsoft and
                Google are switching off basic SMTP authentication tenant by tenant.
              </p>
            ) : (
              <p className="text-xs text-muted mt-1">
                Your IT admin creates an app registration in your Entra ID tenant with
                the <span className="font-mono">Mail.Send</span> application permission
                (admin-consented) and a client secret.
              </p>
            )}
          </div>

          {form.provider_type === "smtp" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Host</label>
                <input
                  className={inputClass}
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="mail.yourcompany.com"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input
                  className={inputClass}
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  inputMode="numeric"
                  placeholder="587"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <input
                  className={inputClass}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="quotes@yourcompany.com"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-card-foreground">
                  <input
                    type="checkbox"
                    checked={form.use_tls}
                    onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
                    className="rounded border-border"
                  />
                  Use TLS (STARTTLS)
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Directory (tenant) ID</label>
                <input
                  className={inputClass}
                  value={form.tenant_id}
                  onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Application (client) ID</label>
                <input
                  className={inputClass}
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-card-foreground">
                  <input
                    type="checkbox"
                    checked={form.save_to_sent_items}
                    onChange={(e) => setForm({ ...form, save_to_sent_items: e.target.checked })}
                    className="rounded border-border"
                  />
                  Keep a copy in the mailbox&apos;s Sent Items
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className={labelClass}>Send from</label>
              <input
                type="email"
                className={inputClass}
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="quotes@yourcompany.com"
                required
              />
              <p className="text-xs text-muted mt-1">
                {form.provider_type === "ms_graph"
                  ? "The mailbox to send as."
                  : "The address vendors will see."}
              </p>
            </div>
            <div>
              <label className={labelClass}>From name</label>
              <input
                className={inputClass}
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Your Company Quotes"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Reply-to (optional)</label>
              <input
                type="email"
                className={inputClass}
                value={form.reply_to}
                onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
                placeholder="sales@yourcompany.com"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <label className={labelClass}>
              {SECRET_LABEL[form.provider_type] || "Credential"}
            </label>
            <input
              type="password"
              className={inputClass}
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder={editing && editing.has_secret ? "Leave blank to keep the saved one" : ""}
              required={!editing}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted mt-1">
              Encrypted before it&apos;s stored, and never shown again — not even to you.
              {editing && editing.has_secret && " Leave this blank to keep the one on file."}
            </p>
          </div>

          {editing && (
            <p className="text-xs text-warning bg-warning/5 border border-warning/20 rounded-md px-3 py-2">
              Saving changes marks this connection unverified. Until you re-test it,
              email goes out from our platform address.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add connection"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(testTarget)}
        onClose={() => setTestTarget(null)}
        title={`Test "${testTarget?.display_name ?? ""}"`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            We&apos;ll connect to your server and sign in. Sending a real test email also
            proves it will accept mail for outside recipients — the part that most
            often turns out to be blocked.
          </p>
          <div>
            <label className={labelClass}>Send a test email to (optional)</label>
            <input
              type="email"
              className={inputClass}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@yourcompany.com"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => runTest(false)}>
              Check sign-in only
            </Button>
            <Button variant="primary" onClick={() => runTest(true)} disabled={!testEmail.trim()}>
              Send test email
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete email connection"
        message={
          deleteTarget?.is_default
            ? `"${deleteTarget.display_name}" is the default for ${deleteTarget.purpose_label}. Deleting it sends that email from our platform address again. The saved credential is destroyed and can't be recovered.`
            : `Delete "${deleteTarget?.display_name}"? The saved credential is destroyed and can't be recovered.`
        }
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
