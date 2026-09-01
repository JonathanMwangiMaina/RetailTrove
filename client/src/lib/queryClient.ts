/**
 * @file client/src/lib/queryClient.ts
 * @description TanStack Query client configuration with CSRF protection and auth-aware fetch wrappers.
 * 
 * Provides:
 * - CSRF token management (fetches from /api/csrf-token on first mutation)
 * - Authenticated fetch wrapper (apiRequest) that includes CSRF token and credentials
 * - TanStack Query client with retry disabled and staleTime: Infinity
 * - Query function factory with 401 handling (returnNull or throw)
 * - Product query invalidation helper
 * 
 * @module Client/QueryClient
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * In-memory CSRF token cache. Populated on first successful fetch to /api/csrf-token.
 * Used to protect mutating requests from CSRF attacks.
 */
let csrfToken: string | null = null;

/**
 * Fetches and caches the CSRF token from the server.
 * Called automatically before the first mutating request.
 * Silently fails if the endpoint is unavailable (requests will then fail with 403).
 */
export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.token;
    }
  } catch {
    // CSRF token fetch failed — requests will fail with 403
  }
}

/**
 * Throws an Error if the Response is not OK.
 * Includes status code and response text in the error message.
 * 
 * @param res - Fetch Response object
 * @throws Error with status and message if res.ok is false
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Authenticated API request wrapper with CSRF protection.
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url - API endpoint path (e.g., "/api/orders")
 * @param data - Optional JSON-serializable request body
 * @returns Promise resolving to Response object
 * @throws Error if response is not OK (includes status and body text)
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (csrfToken && method !== "GET" && method !== "HEAD") {
    headers["x-csrf-token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Type for handling 401 Unauthorized responses in queries.
 * - "returnNull": Returns null instead of throwing (used for optional auth queries)
 * - "throw": Throws an Error (used for protected queries)
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Creates a QueryFunction for TanStack Query with configurable 401 behavior.
 * 
 * @param options.on401 - "returnNull" returns null for 401; "throw" throws Error
 * @returns QueryFunction that fetches with credentials and handles 401 per option
 */
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Configured TanStack Query client instance.
 * 
 * Configuration:
 * - retry: false (fail fast on query/mutation errors)
 * - staleTime: Infinity (data never stale unless explicitly invalidated)
 * - refetchInterval: false (no automatic background refetch)
 * - refetchOnWindowFocus: false (no refetch on window focus)
 * - queryFn: Uses getQueryFn with "throw" behavior by default
 * - mutations: retry: false
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Query key prefixes for product-related queries.
 * Used by invalidateProductQueries to target specific query groups.
 */
const PRODUCT_QUERY_PREFIXES = [
  "/api/products",
  "/api/admin/products",
  "/api/admin/low-stock",
  "/api/vendor/products",
];

/**
 * Invalidates all product-related queries in the TanStack Query cache.
 * Call after product mutations (create/update/delete) to refresh UI.
 * 
 * @returns Promise that resolves when invalidation completes
 */
export function invalidateProductQueries(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && PRODUCT_QUERY_PREFIXES.some((p) => key.startsWith(p));
    },
  });
}
