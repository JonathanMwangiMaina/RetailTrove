import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("../db.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {},
}));

// payment-service.ts reads provider env vars at module load, so set them and
// import dynamically AFTER they are in place.
let createLemonSqueezyCheckout: typeof import("../payment-service.js").createLemonSqueezyCheckout;

beforeAll(async () => {
  process.env.LEMONSQUEEZY_API_KEY = "test-key";
  process.env.LEMONSQUEEZY_STORE_ID = "1";
  process.env.LEMONSQUEEZY_VARIANT_ID = "1";
  ({ createLemonSqueezyCheckout } = await import("../payment-service.js"));
});

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { attributes: { url: "https://checkout.example/x" } } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createLemonSqueezyCheckout currency handling", () => {
  it("scales custom_price by 2 decimals for a 2-decimal currency (EUR)", async () => {
    const fetchMock = mockFetchOk();
    await createLemonSqueezyCheckout({ orderId: 1, amount: 55.5, currency: "EUR" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.data.attributes.custom_price).toBe(5550);
    expect(body.data.attributes.currency).toBe("EUR");
  });

  it("scales custom_price by 0 decimals for a 0-decimal currency (JPY)", async () => {
    const fetchMock = mockFetchOk();
    await createLemonSqueezyCheckout({ orderId: 1, amount: 55.5, currency: "JPY" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.data.attributes.custom_price).toBe(56);
    expect(body.data.attributes.currency).toBe("JPY");
  });

  it("scales custom_price by 3 decimals for a 3-decimal currency (BHD)", async () => {
    const fetchMock = mockFetchOk();
    await createLemonSqueezyCheckout({ orderId: 1, amount: 5.123, currency: "BHD" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.data.attributes.custom_price).toBe(5123);
    expect(body.data.attributes.currency).toBe("BHD");
  });

  it("omits the currency attribute for USD", async () => {
    const fetchMock = mockFetchOk();
    await createLemonSqueezyCheckout({ orderId: 1, amount: 55.5, currency: "USD" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.data.attributes.custom_price).toBe(5550);
    expect(body.data.attributes.currency).toBeUndefined();
  });

  it("defaults to 2 decimals when currency is omitted", async () => {
    const fetchMock = mockFetchOk();
    await createLemonSqueezyCheckout({ orderId: 1, amount: 55.5 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.data.attributes.custom_price).toBe(5550);
  });
});
