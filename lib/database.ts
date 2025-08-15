// lib/database.ts
// Purpose: A small, robust API client for the frontend.
// Fixes addressed:
// - Inconsistent fetch usage and missing error handling
// - Hanging requests (adds timeout via AbortController)
// - JSON parsing failures (non-JSON responses handled gracefully)
// - Duplicated code for GET/POST/PUT/DELETE/form uploads
//
// Usage examples:
//   const data = await getJSON<Dashboard>("/api/dashboard/student");
//   const created = await postJSON<Notice>("/api/notices", { title, body });
//   await putJSON(`/api/items/${id}`, { name });
//   await del(`/api/items/${id}`);
//   await uploadJSON("/api/study-materials/upload", fd);
//
// Errors:
//   - Throws ApiError(status, message, details?) for HTTP errors
//   - Throws Error("Network error") for network/timeout errors

export class ApiError<T = unknown> extends Error {
  status: number;
  details?: T;
  constructor(status: number, message: string, details?: T) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type Json = Record<string, any> | any[] | string | number | boolean | null;

const DEFAULT_TIMEOUT_MS = 20_000;

/** Detects if Content-Type is JSON-ish. */
function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") || ct.includes("+json");
}

/** Fetch with timeout, stable defaults, and normalized errors. */
async function request<T = unknown>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      // For client routes we don't want caching; components control revalidation if on server.
      cache: "no-store",
      ...init,
      signal: controller.signal,
      // Ensure credentials/header merging remains predictable (do not override caller headers).
      headers: {
        ...(init.headers || {}),
      },
    });

    // Try to parse response body safely
    let data: unknown = null;
    if (res.status !== 204) {
      if (isJsonResponse(res)) {
        // Parsing JSON can still throw if body is empty or malformed
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        // Fallback to text for non-JSON payloads
        try {
          data = await res.text();
        } catch {
          data = null;
        }
      }
    }

    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "message" in (data as any) && String((data as any).message)) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      throw new ApiError(res.status, message, data as T);
    }

    return data as T;
  } catch (err: any) {
    // Normalize AbortError / network failures
    if (err?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    if (err instanceof ApiError) throw err;
    throw new Error(err?.message || "Network error");
  } finally {
    clearTimeout(t);
  }
}

/** GET helper: optional query params object -> querystring */
export async function getJSON<T = unknown>(
  url: string,
  params?: Record<string, any>,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      Array.isArray(v)
        ? v.forEach((vv) => u.searchParams.append(k, String(vv)))
        : u.searchParams.set(k, String(v));
    }
  }
  return request<T>(u.toString(), { ...init, method: "GET" });
}

/** POST helper with JSON body */
export async function postJSON<T = unknown>(
  url: string,
  body: Json,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    ...init,
  });
}

/** PUT helper with JSON body */
export async function putJSON<T = unknown>(
  url: string,
  body: Json,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    ...init,
  });
}

/** DELETE helper (optionally send JSON body if your API accepts it) */
export async function del<T = unknown>(
  url: string,
  body?: Json,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<T> {
  return request<T>(url, {
    method: "DELETE",
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, body: JSON.stringify(body) }
      : {}),
    ...init,
  });
}

/** Multipart/form-data upload (e.g., files). Pass an existing FormData. */
export async function uploadJSON<T = unknown>(
  url: string,
  formData: FormData,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  // Let the browser set the boundary; do NOT set Content-Type header.
  return request<T>(url, { method: "POST", body: formData, ...init });
}
