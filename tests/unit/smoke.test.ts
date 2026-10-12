import { describe, expect, it } from "vitest";
import { formatDate, yearOf } from "@/lib/format";
import { getPost } from "@/lib/data/posts";

describe("unit harness smoke test", () => {
  it("resolves @/ imports and runs a pure helper", () => {
    expect(formatDate("2026-08-10")).toBe("August 10, 2026");
    expect(yearOf("2026-08-10")).toBe("2026");
  });

  it("imports a server-only lib/data module that uses React cache()", async () => {
    expect(await getPost("does-not-exist")).toBeNull();
  });
});
