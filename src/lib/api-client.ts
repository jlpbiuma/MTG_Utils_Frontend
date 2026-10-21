/**
 * Centralized API client to communicate with the FastAPI backend.
 */

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

interface BackendFetchOptions extends RequestInit {
  userId?: string;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

export class BackendRequestError extends Error {
  readonly userMessage: string;
  readonly detail: unknown;
  constructor(path: string, readonly status: number, body: string) {
    super(`Backend request to ${path} failed (${status}): ${body}`);
    this.name = "BackendRequestError";
    this.userMessage = "No se pudo completar la solicitud. Inténtalo de nuevo.";
    if (status >= 400 && status < 500) {
      try {
        const detail: unknown = JSON.parse(body).detail;
        this.detail = detail;
        if (typeof detail === "string") this.userMessage = detail;
      } catch { /* Non-JSON errors stay on the server. */ }
    }
  }
}

export async function backendFetch<T = any>(
  path: string,
  options: BackendFetchOptions = {}
): Promise<T> {
  const { userId, headers = {}, cache, next, ...rest } = options;
  const url = `${BACKEND_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (userId) {
    requestHeaders["X-User-Id"] = userId;
  }

  // If executing on the server, automatically inject session token from cookies
  if (typeof window === "undefined" && !requestHeaders["Authorization"]) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("mtg_token")?.value;
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }
      if (!requestHeaders["X-User-Id"]) {
        const uid = cookieStore.get("mtg_user_id")?.value;
        if (uid) {
          requestHeaders["X-User-Id"] = uid;
        }
      }
    } catch {
      // Called outside Next.js request scope
    }
  }

  try {
    const fetchOptions: RequestInit = {
      ...rest,
      headers: requestHeaders,
    };

    if (cache) {
      fetchOptions.cache = cache;
    } else if (!next?.revalidate) {
      fetchOptions.cache = "no-store";
    }

    if (next) {
      (fetchOptions as any).next = next;
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errorText = typeof res.text === "function" ? await res.text().catch(() => "") : "";
      throw new BackendRequestError(path, res.status, errorText);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[API Client Error] ${path}:`, err?.message || err);
    throw err;
  }
}
