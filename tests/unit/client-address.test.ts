import { describe, expect, it } from "vitest";
import { clientKeyFrom } from "@/lib/client-address";

describe("clientKeyFrom", () => {
  it("is null when the proxy is not trusted, whatever the header says", () => {
    expect(clientKeyFrom("1.2.3.4", false)).toBeNull();
    expect(clientKeyFrom("a, b, c", false)).toBeNull();
    expect(clientKeyFrom(null, false)).toBeNull();
  });

  it("is null for a missing, empty or all-empty header even when trusted", () => {
    expect(clientKeyFrom(null, true)).toBeNull();
    expect(clientKeyFrom("", true)).toBeNull();
    expect(clientKeyFrom(" , ", true)).toBeNull();
    expect(clientKeyFrom(",,,", true)).toBeNull();
    expect(clientKeyFrom("   ", true)).toBeNull();
  });

  it("uses the right-most entry", () => {
    expect(clientKeyFrom("a, b, c", true)).toBe("c");
    expect(clientKeyFrom("9.9.9.9", true)).toBe("9.9.9.9");
  });

  it("trims spaces around entries", () => {
    expect(clientKeyFrom("  a ,   b  ", true)).toBe("b");
    expect(clientKeyFrom("\t1.1.1.1\t", true)).toBe("1.1.1.1");
  });

  it("skips trailing empty entries", () => {
    expect(clientKeyFrom("a, b,", true)).toBe("b");
    expect(clientKeyFrom("a, b, , ,", true)).toBe("b");
  });

  it("changing only the left entries keeps the key", () => {
    expect(clientKeyFrom("9.9.9.9, 1.1.1.1", true)).toBe(clientKeyFrom("8.8.8.8, 7.7.7.7, 1.1.1.1", true));
    expect(clientKeyFrom("forged, 1.1.1.1", true)).toBe("1.1.1.1");
  });

  it("changing the right-most entry changes the key", () => {
    expect(clientKeyFrom("a, 1.1.1.1", true)).not.toBe(clientKeyFrom("a, 2.2.2.2", true));
  });
});
