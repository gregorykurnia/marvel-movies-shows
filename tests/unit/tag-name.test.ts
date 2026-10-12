import { describe, expect, it } from "vitest";

import { cleanTagName, TAG_MAX_LENGTH } from "@/lib/tag-name";
import { tagNamesSchema, tagNameSchema } from "@/lib/schemas";

describe("cleanTagName", () => {
  it("drops a leading #, trims, and collapses spaces", () => {
    expect(cleanTagName("  #Re  watch  ")).toBe("Re watch");
    expect(cleanTagName("##favourite")).toBe("favourite");
  });

  it("returns nothing for a blank or a bare #", () => {
    expect(cleanTagName("   ")).toBe("");
    expect(cleanTagName("#")).toBe("");
  });

  it("keeps at most the maximum length", () => {
    expect(cleanTagName("x".repeat(TAG_MAX_LENGTH + 10))).toHaveLength(TAG_MAX_LENGTH);
  });
});

describe("tagNameSchema", () => {
  it("cleans the name and refuses an empty one", () => {
    expect(tagNameSchema.parse("#Important ")).toBe("Important");
    expect(tagNameSchema.safeParse("  # ").success).toBe(false);
  });
});

describe("tagNamesSchema", () => {
  it("drops blanks, and repeats that differ only in case, keeping the first spelling", () => {
    expect(tagNamesSchema.parse(["Rewatch", "", "rewatch", " #Favourite "])).toEqual(["Rewatch", "Favourite"]);
  });

  it("refuses more than fifty tags", () => {
    expect(tagNamesSchema.safeParse(Array.from({ length: 51 }, (_, i) => `t${i}`)).success).toBe(false);
  });
});
