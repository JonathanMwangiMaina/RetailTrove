import { describe, it, expect } from "vitest";
import { checkLockfileConsistency } from "../../scripts/check-packages.mjs";

describe("package-lock consistency", () => {
  it("matches package.json dependency specs exactly", () => {
    const errors = checkLockfileConsistency();
    expect(errors).toEqual([]);
  });
});
