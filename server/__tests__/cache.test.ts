import { describe, it, expect, vi } from "vitest";
import { cache, cacheKeys, CACHE_TTLS, type CacheClient } from "../cache.js";

function makeFakeClient(): CacheClient {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => {
      const raw = store.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    }),
    set: vi.fn(async (key: string, value: unknown, opts?: { ex?: number }) => {
      store.set(key, JSON.stringify(value));
      void opts; // fake ignores TTL
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const k of keys) {
        if (store.delete(k)) count++;
      }
      return count;
    }),
    keys: vi.fn(async (pattern: string) => {
      const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return [...store.keys()].filter((k) => re.test(k));
    }),
  };
}

describe("cacheKeys", () => {
  it("builds a deterministic list key from params", () => {
    const a = cacheKeys.productsList({ category: "Clothing", q: "jacket", limit: 20 });
    const b = cacheKeys.productsList({ q: "jacket", category: "Clothing", limit: 20 });
    expect(a).toBe(b);
    expect(a).toContain("products:list");
    expect(a).toContain("Clothing");
  });

  it("distinguishes different filter states", () => {
    const withStock = cacheKeys.productsList({ inStock: true });
    const withoutStock = cacheKeys.productsList({});
    expect(withStock).not.toBe(withoutStock);
  });

  it("builds singleton keys for featured/new arrivals/settings/product", () => {
    expect(cacheKeys.featuredProducts).toBe("products:featured");
    expect(cacheKeys.newArrivals).toBe("products:new-arrivals");
    expect(cacheKeys.siteSettings).toBe("settings:all");
    expect(cacheKeys.product(42)).toBe("products:42");
  });
});

describe("cache helpers with a client", () => {
  it("returns cached value on hit", async () => {
    const c = makeFakeClient();
    const value = { data: [{ id: 1, name: "Widget" }], nextCursor: null };
    await cache.set("products:list:", value, CACHE_TTLS.productsList, c);
    const got = await cache.get<typeof value>("products:list:", c);
    expect(got).toEqual(value);
  });

  it("returns null on miss", async () => {
    const c = makeFakeClient();
    expect(await cache.get("missing", c)).toBeNull();
  });

  it("deletes an exact key", async () => {
    const c = makeFakeClient();
    await cache.set("settings:all", [{ key: "x", value: "1" }], 10, c);
    await cache.del("settings:all", c);
    expect(await cache.get("settings:all", c)).toBeNull();
  });

  it("deletes every key with a prefix", async () => {
    const c = makeFakeClient();
    await cache.set("products:list:", [], 10, c);
    await cache.set("products:featured", [], 10, c);
    await cache.set("products:12", [], 10, c);
    await cache.set("settings:all", [], 10, c);
    await cache.delPrefix("products:", c);
    expect(await cache.get("products:list:", c)).toBeNull();
    expect(await cache.get("products:featured", c)).toBeNull();
    expect(await cache.get("products:12", c)).toBeNull();
    expect(await cache.get("settings:all", c)).not.toBeNull();
  });
});

describe("cache without a client", () => {
  it("get returns null when no client configured", async () => {
    expect(await cache.get("anything", null)).toBeNull();
  });

  it("set/del/delPrefix no-op when no client configured", async () => {
    await expect(cache.set("k", { v: 1 }, 10, null)).resolves.toBeUndefined();
    await expect(cache.del("k", null)).resolves.toBeUndefined();
    await expect(cache.delPrefix("k:", null)).resolves.toBeUndefined();
  });

  it("get swallows client errors and returns null", async () => {
    const c: CacheClient = {
      get: vi.fn().mockRejectedValue(new Error("boom")),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    };
    expect(await cache.get("k", c)).toBeNull();
  });

  it("set swallows client errors", async () => {
    const c: CacheClient = {
      get: vi.fn(),
      set: vi.fn().mockRejectedValue(new Error("boom")),
      del: vi.fn(),
      keys: vi.fn(),
    };
    await expect(cache.set("k", { v: 1 }, 10, c)).resolves.toBeUndefined();
  });
});
