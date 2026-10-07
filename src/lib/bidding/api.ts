// Small fetch helpers shared by the Bidding pages.

/** The proxy passes FastAPI's `detail` through as `error`; on a 422 that is
 *  pydantic's list of {loc, msg} objects rather than a string. */
export function errorText(data: unknown, fallback: string): string {
  const err = (data as { error?: unknown })?.error;
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    return err
      .map((e) => String((e as { msg?: string })?.msg ?? "").replace(/^Value error, /, ""))
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

/** JSON fetch that throws Error(message) on a non-2xx response. */
export async function bidFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorText(data, `Request failed (${res.status}).`));
  return data as T;
}

export function money(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 5 });
}
