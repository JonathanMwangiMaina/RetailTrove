import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRIES_BY_NAME, getCountryByCode } from "../countries";

describe("COUNTRIES", () => {
  it("has 240 entries", () => {
    expect(COUNTRIES.length).toBe(240);
  });

  it("each has a 2-letter code and a name", () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name).toBeTruthy();
    }
  });

  it("has no duplicate codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes major countries", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain("US");
    expect(codes).toContain("GB");
    expect(codes).toContain("JP");
    expect(codes).toContain("AU");
    expect(codes).toContain("BR");
    expect(codes).toContain("IN");
    expect(codes).toContain("DE");
    expect(codes).toContain("FR");
    expect(codes).toContain("NG");
    expect(codes).toContain("ZA");
  });
});

describe("COUNTRIES_BY_NAME", () => {
  it("is sorted alphabetically by name", () => {
    for (let i = 1; i < COUNTRIES_BY_NAME.length; i++) {
      expect(
        COUNTRIES_BY_NAME[i - 1].name.localeCompare(COUNTRIES_BY_NAME[i].name)
      ).toBeLessThanOrEqual(0);
    }
  });

  it("has same count as COUNTRIES", () => {
    expect(COUNTRIES_BY_NAME.length).toBe(COUNTRIES.length);
  });
});

describe("getCountryByCode", () => {
  it("returns the country for a valid code", () => {
    const us = getCountryByCode("US");
    expect(us).toBeDefined();
    expect(us!.name).toBe("United States");
  });

  it("returns undefined for an invalid code", () => {
    expect(getCountryByCode("ZZ")).toBeUndefined();
  });

  it("is case-sensitive", () => {
    expect(getCountryByCode("us")).toBeUndefined();
    expect(getCountryByCode("US")).toBeDefined();
  });
});
