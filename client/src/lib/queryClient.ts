import { QueryClient, QueryFunction } from "@tanstack/react-query";

let csrfToken: string | null = null;

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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

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

type UnauthorizedBehavior = "returnNull" | "throw";
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

const PRODUCT_QUERY_PREFIXES = [
  "/api/products",
  "/api/admin/products",
  "/api/admin/low-stock",
  "/api/vendor/products",
];

export function invalidateProductQueries(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && PRODUCT_QUERY_PREFIXES.some((p) => key.startsWith(p));
    },
  });
}
