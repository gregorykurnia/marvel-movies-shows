import { describe, expect, it } from "vitest";

import { toPrefixQuery } from "@/lib/search-query";

describe("toPrefixQuery", () => {
  it("makes every word a prefix match", () => {
    expect(toPrefixQuery("loki")).toBe("loki:*");
    expect(toPrefixQuery("Thor ragnarok")).toBe("thor:* & ragnarok:*");
  });

  it("keeps letters from any language and digits, and drops punctuation", () => {
    expect(toPrefixQuery("Zoë")).toBe("zoë:*");
    expect(toPrefixQuery("Earth-616")).toBe("earth:* & 616:*");
    expect(toPrefixQuery("  it's   ")).toBe("it:* & s:*");
  });

  it("returns null when there is nothing to search for", () => {
    expect(toPrefixQuery("")).toBeNull();
    expect(toPrefixQuery("   ")).toBeNull();
    expect(toPrefixQuery("!!!")).toBeNull();
    expect(toPrefixQuery("a")).toBeNull();
  });

  it("never lets tsquery operators through", () => {
    expect(toPrefixQuery("a & b | !c:*")).toBe("a:* & b:* & c:*");
  });
});
