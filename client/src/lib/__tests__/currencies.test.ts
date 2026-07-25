import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  CURRENCIES_BY_CODE,
  getCurrency,
  formatPrice,
  convertCurrency,
} from "../currencies";

describe("CURRENCIES", () => {
  it("has 155 entries", () => {
    expect(CURRENCIES.length).toBe(155);
  });

  it("each has a code, name, symbol, and decimalPlaces", () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.symbol).toBeTruthy();
      expect(typeof c.decimalPlaces).toBe("number");
      expect(c.decimalPlaces).toBeGreaterThanOrEqual(0);
      expect(c.decimalPlaces).toBeLessThanOrEqual(3);
    }
  });

  it("has no duplicate codes", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("CURRENCIES_BY_CODE lookup matches CURRENCIES", () => {
    for (const c of CURRENCIES) {
      expect(CURRENCIES_BY_CODE[c.code]).toEqual(c);
    }
  });
});

describe("getCurrency", () => {
  it("returns the currency for a valid code", () => {
    const usd = getCurrency("USD");
    expect(usd).toBeDefined();
    expect(usd!.code).toBe("USD");
    expect(usd!.name).toBe("US Dollar");
  });

  it("returns undefined for an invalid code", () => {
    expect(getCurrency("ZZZ")).toBeUndefined();
  });
});

describe("convertCurrency", () => {
  it("returns the same amount for USD", () => {
    expect(convertCurrency(100, "USD")).toBe(100);
  });

  it("converts USD to EUR", () => {
    const result = convertCurrency(100, "EUR");
    expect(result).toBeGreaterThan(80);
    expect(result).toBeLessThan(100);
  });

  it("returns original amount for unknown currency", () => {
    expect(convertCurrency(50, "ZZZ")).toBe(50);
  });

  it("handles zero amount", () => {
    expect(convertCurrency(0, "EUR")).toBe(0);
  });

  it("handles negative amounts", () => {
    expect(convertCurrency(-10, "GBP")).toBeLessThan(0);
  });
});

describe("formatPrice", () => {
  it("formats USD correctly", () => {
    const result = formatPrice(29.99, "USD");
    expect(result).toMatch(/^\$[ ]?29\.99$/);
  });

  it("formats EUR with 2 decimal places", () => {
    const result = formatPrice(10, "EUR");
    expect(result).toContain("€");
    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it("formats JPY with 0 decimal places", () => {
    const result = formatPrice(10, "JPY");
    expect(result).toContain("¥");
    expect(result).not.toMatch(/\.\d/);
  });

  it("formats BHD with 3 decimal places", () => {
    const result = formatPrice(10, "BHD");
    expect(result).toContain("BD");
    expect(result).toMatch(/\d+\.\d{3}/);
  });

  it("falls back to $ for unknown currency", () => {
    const result = formatPrice(42.5, "ZZZ");
    expect(result).toBe("$42.50");
  });

  it("handles zero", () => {
    const result = formatPrice(0, "USD");
    expect(result).toMatch(/^\$[ ]?0\.00$/);
  });
});
