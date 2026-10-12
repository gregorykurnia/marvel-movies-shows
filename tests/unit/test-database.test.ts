import { describe, expect, it } from "vitest";

import { assertTestDatabase } from "../support/test-database";

describe("assertTestDatabase", () => {
  it("returns the test URL when it differs from production", () => {
    expect(assertTestDatabase("postgres://test", "postgres://prod")).toBe("postgres://test");
  });

  it("refuses when the test URL is missing", () => {
    expect(() => assertTestDatabase(undefined, "postgres://prod")).toThrow(/not set/);
  });

  it("refuses when the test URL is the production URL", () => {
    expect(() => assertTestDatabase("postgres://prod", "postgres://prod")).toThrow(/production/);
  });

  it("allows a run when production is not configured", () => {
    expect(assertTestDatabase("postgres://test", undefined)).toBe("postgres://test");
  });
});
