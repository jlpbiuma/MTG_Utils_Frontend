/**
 * Centralized API client to communicate with the FastAPI backend.
 */

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

interface BackendFetchOptions extends RequestInit {
  userId?: string;
}

export async function backendFetch<T = any>(
  path: string,
  options: BackendFetchOptions = {}
): Promise<T> {
  const { userId, headers = {}, ...rest } = options;
  const url = `${BACKEND_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (userId) {
    requestHeaders["X-User-Id"] = userId;
  }

  try {
    const res = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = typeof res.text === "function" ? await res.text().catch(() => "") : "";
      throw new Error(`Backend request to ${path} failed (${res.status}): ${errorText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[API Client Error] ${path}:`, err?.message || err);
    throw err;
  }
}
