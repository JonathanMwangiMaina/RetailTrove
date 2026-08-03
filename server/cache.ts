import { Redis } from "@upstash/redis";

export const CACHE_TTLS = {
  productsList: 300,
  featuredProducts: 300,
  newArrivals: 300,
  product: 300,
  siteSettings: 600,
} as const;

export type CacheClient = Pick<Redis, "get" | "set" | "del" | "keys">;

let client: Redis | null | undefined;

/**
 * Lazily builds the Upstash Redis client.
 *
 * Returns null when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
 * unset — the cache is an optional optimization and the database remains the
 * source of truth. This is config-optional behaviour, NOT a stub: when a
 * client exists it is used exactly as configured.
 */
export function getCache(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return null;
  }
  client = new Redis({ url, token });
  return client;
}

export const cacheKeys = {
  productsList(params: {
    category?: string;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    cursor?: number;
    limit?: number;
  }): string {
    return [
      "products:list",
      params.category ?? "",
      params.q?.trim().toLowerCase() ?? "",
      params.minPrice ?? "",
      params.maxPrice ?? "",
      params.minRating ?? "",
      params.inStock ?? "",
      params.cursor ?? "",
      params.limit ?? "",
    ].join(":");
  },
  featuredProducts: "products:featured",
  newArrivals: "products:new-arrivals",
  product(id: number): string {
    return `products:${id}`;
  },
  siteSettings: "settings:all",
} as const;

async function cacheGet<T>(key: string, c: CacheClient | null = getCache()): Promise<T | null> {
  if (!c) return null;
  try {
    return await c.get<T>(key);
  } catch {
    return null;
  }
}

async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = CACHE_TTLS.productsList,
  c: CacheClient | null = getCache(),
): Promise<void> {
  if (!c) return;
  try {
    await c.set(key, value, { ex: ttl });
  } catch {
    // cache is best-effort; the DB remains the source of truth
  }
}

async function cacheDel(key: string, c: CacheClient | null = getCache()): Promise<void> {
  if (!c) return;
  try {
    await c.del(key);
  } catch {
    // ignore
  }
}

/** Deletes every key starting with `prefix` (e.g. all "products:" keys). */
async function cacheDelPrefix(prefix: string, c: CacheClient | null = getCache()): Promise<void> {
  if (!c) return;
  try {
    const keys = await c.keys(`${prefix}*`);
    if (keys.length > 0) {
      await c.del(...keys);
    }
  } catch {
    // ignore
  }
}

export const cache = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPrefix: cacheDelPrefix,
};

export { cacheGet, cacheSet, cacheDel, cacheDelPrefix };
