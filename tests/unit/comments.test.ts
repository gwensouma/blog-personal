import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/headers and next/cache only work inside a Next request: mock them for the action.
const requestHeaders = vi.hoisted(() => new Map<string, string>());
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null }),
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const dataDir = mkdtempSync(path.join(os.tmpdir(), "rsc-blog-comments-"));
process.env.BLOG_DATA_DIR = dataDir;

const { addComment, getComments, resetCommentLimitsForTests } = await import("@/lib/data/comments");
const { addCommentAction } = await import("@/lib/actions/comments");
const { readStore, resetStoreForTests, updateStore } = await import("@/lib/data/store");

type Stored = { id: string; slug: string; name: string; body: string; createdAt: string; hidden: boolean };
type CommentStore = Record<string, Stored[]>;

let testCount = 0;
beforeEach(() => {
  resetStoreForTests();
  resetCommentLimitsForTests();
  process.env.BLOG_DATA_DIR = path.join(dataDir, `t${++testCount}`);
  delete process.env.TRUST_PROXY;
  requestHeaders.clear();
  revalidatePath.mockClear();
});
afterEach(() => {
  resetStoreForTests();
  resetCommentLimitsForTests();
});
afterAll(() => {
  process.env.BLOG_DATA_DIR = dataDir;
  delete process.env.TRUST_PROXY;
  rmSync(dataDir, { recursive: true, force: true });
});

const SLUG = "streaming-with-suspense";
const OTHER = "caching-in-the-app-router";
const T0 = new Date("2026-10-20T12:00:00.000Z");
const MIN = 60_000;
const at = (ms: number) => new Date(T0.getTime() + ms);

async function stored(): Promise<CommentStore> {
  return readStore<CommentStore>("comments", {});
}
async function storedCount(): Promise<number> {
  return Object.values(await stored()).reduce((sum, list) => sum + list.length, 0);
}
async function seed(store: CommentStore) {
  await updateStore<CommentStore>("comments", {}, () => store);
}
function seedComment(slug: string, i: number, extra: Partial<Stored> = {}): Stored {
  return { id: `id-${slug}-${i}`, slug, name: `Seed ${i}`, body: `Seed body ${i}`, createdAt: "2020-01-01T00:00:00.000Z", hidden: false, ...extra };
}
const post = (n: number, extra: Partial<Parameters<typeof addComment>[0]> = {}) =>
  addComment({ slug: SLUG, name: "Ann", body: `body ${n}`, clientKey: null, now: T0, ...extra });

describe("getComments", () => {
  it("returns [] for a post with no comments and for an unknown slug", async () => {
    expect(await getComments(SLUG)).toEqual([]);
    expect(await getComments("does-not-exist")).toEqual([]);
  });

  it("returns [] for prototype-ish slugs instead of throwing", async () => {
    for (const slug of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
      expect(await getComments(slug), slug).toEqual([]);
    }
  });

  it("returns visible comments oldest first, regardless of storage order", async () => {
    await seed({
      [SLUG]: [
        seedComment(SLUG, 3, { createdAt: "2026-03-01T00:00:00.000Z" }),
        seedComment(SLUG, 1, { createdAt: "2026-01-01T00:00:00.000Z" }),
        seedComment(SLUG, 2, { createdAt: "2026-02-01T00:00:00.000Z" }),
      ],
    });
    expect((await getComments(SLUG)).map((c) => c.name)).toEqual(["Seed 1", "Seed 2", "Seed 3"]);
  });

  it("only returns the comments of the asked post", async () => {
    await post(1);
    await post(2, { slug: OTHER });
    expect((await getComments(SLUG)).map((c) => c.body)).toEqual(["body 1"]);
    expect((await getComments(OTHER)).map((c) => c.body)).toEqual(["body 2"]);
  });

  it("does not return hidden comments (AC13)", async () => {
    await seed({
      [SLUG]: [seedComment(SLUG, 1), seedComment(SLUG, 2, { hidden: true }), seedComment(SLUG, 3)],
    });
    expect((await getComments(SLUG)).map((c) => c.name)).toEqual(["Seed 1", "Seed 3"]);
  });

  it("returns [] when every comment is hidden", async () => {
    await seed({ [SLUG]: [seedComment(SLUG, 1, { hidden: true })] });
    expect(await getComments(SLUG)).toEqual([]);
  });

  it("a stored comment comes back with name, body, an ISO createdAt and hidden false", async () => {
    await post(1);
    const [comment] = await getComments(SLUG);
    expect(comment).toMatchObject({ slug: SLUG, name: "Ann", body: "body 1", createdAt: T0.toISOString(), hidden: false });
    expect(comment.id).toBeTruthy();
  });
});

describe("addComment: per-post cap (AC9)", () => {
  it("rejects the 501st comment with 'full', hidden ones included, and stores nothing", async () => {
    const list = Array.from({ length: 500 }, (_, i) => seedComment(SLUG, i, { hidden: i % 7 === 0 }));
    await seed({ [SLUG]: list });
    expect(await post(1)).toEqual({ status: "full" });
    expect((await stored())[SLUG]).toHaveLength(500);
  });

  it("accepts the 500th comment", async () => {
    await seed({ [SLUG]: Array.from({ length: 499 }, (_, i) => seedComment(SLUG, i)) });
    expect(await post(1)).toEqual({ status: "ok" });
    expect((await stored())[SLUG]).toHaveLength(500);
  });

  it("a full post does not block another post", async () => {
    await seed({ [SLUG]: Array.from({ length: 500 }, (_, i) => seedComment(SLUG, i)) });
    expect(await post(1, { slug: OTHER })).toEqual({ status: "ok" });
  });

  it("hiding does not free room: 500 hidden comments still fill the post", async () => {
    await seed({ [SLUG]: Array.from({ length: 500 }, (_, i) => seedComment(SLUG, i, { hidden: true })) });
    expect(await post(1)).toEqual({ status: "full" });
  });
});

describe("addComment: site-wide rate limit without a key (AC10)", () => {
  it("accepts 30 in 10 minutes, rejects the 31st across different slugs, stores nothing for it", async () => {
    for (let i = 0; i < 30; i++) {
      expect(await post(i, { slug: i % 2 ? SLUG : OTHER })).toEqual({ status: "ok" });
    }
    expect(await storedCount()).toBe(30);
    expect(await post(31, { slug: "rsc-shrinks-your-bundle" })).toEqual({ status: "rate-limited" });
    expect(await post(32)).toEqual({ status: "rate-limited" });
    expect(await storedCount()).toBe(30);
  });

  it("allows again once the window has passed, and still limits just before it", async () => {
    for (let i = 0; i < 30; i++) await post(i);
    expect(await post(100, { now: at(10 * MIN - 1) })).toEqual({ status: "rate-limited" });
    expect(await post(101, { now: at(10 * MIN) })).toEqual({ status: "ok" });
    expect(await storedCount()).toBe(31);
  });

  it("slides: as the oldest comments age out, room opens one by one", async () => {
    for (let i = 0; i < 30; i++) await post(i, { now: at(i * 1000) }); // one per second
    expect(await post(100, { now: at(30 * 1000) })).toEqual({ status: "rate-limited" });
    // At +10:00 only the first has aged out.
    expect(await post(101, { now: at(10 * MIN) })).toEqual({ status: "ok" });
    expect(await post(102, { now: at(10 * MIN) })).toEqual({ status: "rate-limited" });
  });

  it("old comments (hours ago) do not count", async () => {
    await seed({ [SLUG]: Array.from({ length: 40 }, (_, i) => seedComment(SLUG, i, { createdAt: "2026-10-20T08:00:00.000Z" })) });
    expect(await post(1)).toEqual({ status: "ok" });
  });

  it("hidden recent comments still count toward the site-wide limit", async () => {
    await seed({
      [SLUG]: Array.from({ length: 30 }, (_, i) => seedComment(SLUG, i, { hidden: true, createdAt: T0.toISOString() })),
    });
    expect(await post(1, { slug: OTHER })).toEqual({ status: "rate-limited" });
  });

  it("an explicit null key is limited site-wide", async () => {
    for (let i = 0; i < 30; i++) await post(i, { clientKey: null });
    expect(await post(99, { clientKey: null })).toEqual({ status: "rate-limited" });
  });
});

describe("addComment: per-address rate limit with a key (AC10)", () => {
  it("rejects the 6th from one key while another key can still post; nothing stored on rejection", async () => {
    for (let i = 0; i < 5; i++) expect(await post(i, { clientKey: "1.1.1.1" })).toEqual({ status: "ok" });
    expect(await post(5, { clientKey: "1.1.1.1" })).toEqual({ status: "rate-limited" });
    expect(await storedCount()).toBe(5);
    expect(await post(6, { clientKey: "2.2.2.2" })).toEqual({ status: "ok" });
    expect(await storedCount()).toBe(6);
  });

  it("keyed posts are not capped by the site-wide 30 (each key has its own 5)", async () => {
    for (let k = 0; k < 7; k++) {
      for (let i = 0; i < 5; i++) expect(await post(k * 10 + i, { clientKey: `10.0.0.${k}` })).toEqual({ status: "ok" });
    }
    expect(await storedCount()).toBe(35);
  });

  it("frees the key after the window", async () => {
    for (let i = 0; i < 5; i++) await post(i, { clientKey: "1.1.1.1" });
    expect(await post(10, { clientKey: "1.1.1.1", now: at(10 * MIN - 1) })).toEqual({ status: "rate-limited" });
    expect(await post(11, { clientKey: "1.1.1.1", now: at(10 * MIN) })).toEqual({ status: "ok" });
  });

  it("the limit follows the key across different posts", async () => {
    for (let i = 0; i < 5; i++) await post(i, { clientKey: "1.1.1.1", slug: i % 2 ? SLUG : OTHER });
    expect(await post(9, { clientKey: "1.1.1.1", slug: "rsc-shrinks-your-bundle" })).toEqual({ status: "rate-limited" });
  });

  it("a rejected comment does not extend the key's penalty (rejections are not recorded)", async () => {
    for (let i = 0; i < 5; i++) await post(i, { clientKey: "1.1.1.1" });
    for (let i = 0; i < 10; i++) await post(50 + i, { clientKey: "1.1.1.1", now: at(5 * MIN) });
    expect(await post(99, { clientKey: "1.1.1.1", now: at(10 * MIN) })).toEqual({ status: "ok" });
  });

  it("concurrent posts from one key never exceed 5", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => post(i, { clientKey: "3.3.3.3" })));
    expect(results.filter((r) => r.status === "ok")).toHaveLength(5);
    expect(await storedCount()).toBe(5);
  });

  it("does not persist the address anywhere in the store", async () => {
    await post(1, { clientKey: "203.0.113.77" });
    expect(JSON.stringify(await stored())).not.toContain("203.0.113.77");
  });
});

describe("addComment: duplicates (AC15)", () => {
  it("the same slug, name and body within 10 minutes is 'duplicate' and stored once", async () => {
    expect(await post(1)).toEqual({ status: "ok" });
    expect(await post(1, { now: at(5 * MIN) })).toEqual({ status: "duplicate" });
    expect(await post(1, { now: at(10 * MIN - 1) })).toEqual({ status: "duplicate" });
    expect(await getComments(SLUG)).toHaveLength(1);
  });

  it("is stored again after 10 minutes", async () => {
    await post(1);
    expect(await post(1, { now: at(10 * MIN) })).toEqual({ status: "ok" });
    expect(await getComments(SLUG)).toHaveLength(2);
  });

  it("a different name, a different body or a different post is not a duplicate", async () => {
    await post(1);
    expect(await post(1, { name: "Bob" })).toEqual({ status: "ok" });
    expect(await post(2)).toEqual({ status: "ok" });
    expect(await post(1, { slug: OTHER })).toEqual({ status: "ok" });
  });

  it("a hidden recent duplicate is still a duplicate", async () => {
    await seed({ [SLUG]: [seedComment(SLUG, 1, { name: "Ann", body: "body 1", hidden: true, createdAt: T0.toISOString() })] });
    expect(await post(1)).toEqual({ status: "duplicate" });
    expect((await stored())[SLUG]).toHaveLength(1);
  });

  it("does not count toward the rate limit (keyed)", async () => {
    for (let i = 0; i < 4; i++) await post(i, { clientKey: "1.1.1.1" });
    for (let i = 0; i < 6; i++) expect(await post(0, { clientKey: "1.1.1.1" })).toEqual({ status: "duplicate" });
    expect(await post(4, { clientKey: "1.1.1.1" })).toEqual({ status: "ok" });
    expect(await post(5, { clientKey: "1.1.1.1" })).toEqual({ status: "rate-limited" });
  });

  it("does not count toward the site-wide limit (unkeyed)", async () => {
    for (let i = 0; i < 29; i++) await post(i);
    for (let i = 0; i < 5; i++) expect(await post(0)).toEqual({ status: "duplicate" });
    expect(await post(29)).toEqual({ status: "ok" });
    expect(await post(30)).toEqual({ status: "rate-limited" });
  });

  it("is answered 'duplicate' even when the post is full or the sender is rate limited", async () => {
    await seed({
      [SLUG]: [
        ...Array.from({ length: 499 }, (_, i) => seedComment(SLUG, i)),
        seedComment(SLUG, 999, { name: "Ann", body: "dup", createdAt: T0.toISOString() }),
      ],
    });
    expect(await post(0, { body: "dup" })).toEqual({ status: "duplicate" });
    expect(await post(1)).toEqual({ status: "full" });
  });

  it("concurrent identical posts are stored once", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => post(1)));
    expect(results.filter((r) => r.status === "ok")).toHaveLength(1);
    expect(await getComments(SLUG)).toHaveLength(1);
  });
});

describe("addComment: a rejection stores nothing", () => {
  it("leaves the store untouched for full, rate-limited and duplicate", async () => {
    await seed({ [OTHER]: Array.from({ length: 500 }, (_, i) => seedComment(OTHER, i)) });
    const before = JSON.stringify(await stored());
    expect(await post(1, { slug: OTHER })).toEqual({ status: "full" });
    expect(JSON.stringify(await stored())).toBe(before);
  });
});

// The action calls getPost(), which renders the post (cold Shiki: several seconds).
describe("addCommentAction", { timeout: 60_000 }, () => {
  const idle = { status: "idle", message: "" } as const;
  function form(fields: Record<string, string | Blob | undefined>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) data.set(key, value);
    return data;
  }
  const valid = (extra: Record<string, string | Blob | undefined> = {}) =>
    form({ slug: SLUG, name: "Ann", body: "Hello there", website: "", ...extra });

  it("stores a valid comment, answers success and revalidates the post (AC12)", async () => {
    const state = await addCommentAction(idle, valid());
    expect(state).toMatchObject({ status: "success", message: "Thanks, your comment is posted." });
    expect((await getComments(SLUG)).map((c) => [c.name, c.body])).toEqual([["Ann", "Hello there"]]);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith(`/posts/${SLUG}`);
  });

  it("stores the cleaned values", async () => {
    await addCommentAction(idle, valid({ name: "  Ann\u202E \t Lee ", body: "a\r\n\r\n\r\nb\u0000" }));
    expect((await getComments(SLUG)).map((c) => [c.name, c.body])).toEqual([["Ann Lee", "a\n\nb"]]);
  });

  it("stores HTML and URLs as typed (escaping is the renderer's job)", async () => {
    await addCommentAction(idle, valid({ body: "<b>hi</b> https://x.y <img src=x onerror=alert(1)>" }));
    expect((await getComments(SLUG))[0].body).toBe("<b>hi</b> https://x.y <img src=x onerror=alert(1)>");
  });

  it("honeypot filled: success, nothing stored, no revalidate (AC8)", async () => {
    const state = await addCommentAction(idle, valid({ website: "http://spam.example" }));
    expect(state).toMatchObject({ status: "success", message: "Thanks, your comment is posted." });
    expect(await storedCount()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("a missing honeypot field is treated as empty", async () => {
    const state = await addCommentAction(idle, form({ slug: SLUG, name: "Ann", body: "no honeypot" }));
    expect(state.status).toBe("success");
    expect(await storedCount()).toBe(1);
  });

  it("name of 50 is stored, 51 is rejected with the field and the typed values echoed (AC5, AC6)", async () => {
    expect((await addCommentAction(idle, valid({ name: "n".repeat(50) }))).status).toBe("success");
    const name = "n".repeat(51);
    const state = await addCommentAction(idle, valid({ name, body: "keep me" }));
    expect(state).toMatchObject({ status: "error", field: "name", name, body: "keep me" });
    expect(state.message).toBeTruthy();
    expect(await storedCount()).toBe(1);
  });

  it("body of 2000 is stored, 2001 is rejected with the field and the typed values echoed (AC5, AC6)", async () => {
    expect((await addCommentAction(idle, valid({ body: "b".repeat(2000) }))).status).toBe("success");
    const body = "b".repeat(2001);
    const state = await addCommentAction(idle, valid({ name: "Ann", body }));
    expect(state).toMatchObject({ status: "error", field: "body", name: "Ann", body });
    expect(await storedCount()).toBe(1);
  });

  it("empty and whitespace-only name or body are rejected on the right field (AC5)", async () => {
    expect(await addCommentAction(idle, valid({ name: "" }))).toMatchObject({ status: "error", field: "name" });
    expect(await addCommentAction(idle, valid({ name: "   " }))).toMatchObject({ status: "error", field: "name" });
    expect(await addCommentAction(idle, valid({ body: "" }))).toMatchObject({ status: "error", field: "body" });
    expect(await addCommentAction(idle, valid({ body: " \n\t " }))).toMatchObject({ status: "error", field: "body" });
    expect(await addCommentAction(idle, valid({ body: "\u202E\u0007" }))).toMatchObject({ status: "error", field: "body" });
    expect(await storedCount()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("missing or unknown slug gives the generic error, no throw, nothing stored (AC11)", async () => {
    const generic = { status: "error", message: "Something went wrong. Please reload the page and try again." };
    expect(await addCommentAction(idle, form({ name: "Ann", body: "x" }))).toMatchObject(generic);
    expect(await addCommentAction(idle, valid({ slug: "" }))).toMatchObject(generic);
    expect(await addCommentAction(idle, valid({ slug: "does-not-exist" }))).toMatchObject(generic);
    expect(await addCommentAction(idle, valid({ slug: "../store" }))).toMatchObject(generic);
    expect(await addCommentAction(idle, valid({ slug: "__proto__" }))).toMatchObject(generic);
    expect(await storedCount()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("non-string fields (a File) give the generic error without throwing (AC11)", async () => {
    const file = new File(["x"], "x.txt", { type: "text/plain" });
    for (const field of ["slug", "name", "body", "website"]) {
      const state = await addCommentAction(idle, valid({ [field]: file }));
      expect(state, field).toMatchObject({ status: "error", message: "Something went wrong. Please reload the page and try again." });
    }
    expect(await storedCount()).toBe(0);
  });

  it("missing name or body gives the generic error (AC11)", async () => {
    expect((await addCommentAction(idle, form({ slug: SLUG, body: "x" }))).status).toBe("error");
    expect((await addCommentAction(idle, form({ slug: SLUG, name: "Ann" }))).status).toBe("error");
    expect(await storedCount()).toBe(0);
  });

  it("garbage previous state or an empty FormData does not throw", async () => {
    const action = addCommentAction as unknown as (prev: unknown, data: unknown) => Promise<unknown>;
    expect(await action(undefined, new FormData())).toMatchObject({ status: "error" });
    expect(await action(null, valid())).toMatchObject({ status: "success" });
  });

  it("a duplicate answers success, stores once and revalidates only for the first (AC12, AC15)", async () => {
    expect((await addCommentAction(idle, valid())).status).toBe("success");
    expect((await addCommentAction(idle, valid())).status).toBe("success");
    expect(await getComments(SLUG)).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("the full post error has its message, keeps the typed values and does not revalidate (AC9)", async () => {
    await seed({ [SLUG]: Array.from({ length: 500 }, (_, i) => seedComment(SLUG, i)) });
    const state = await addCommentAction(idle, valid({ body: "late" }));
    expect(state).toMatchObject({ status: "error", message: "This post has reached its comment limit.", name: "Ann", body: "late" });
    expect((await stored())[SLUG]).toHaveLength(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("without TRUST_PROXY the 31st is rate limited, even with an X-Forwarded-For header (AC10)", async () => {
    requestHeaders.set("x-forwarded-for", "5.5.5.5");
    for (let i = 0; i < 30; i++) expect((await addCommentAction(idle, valid({ body: `c ${i}` }))).status).toBe("success");
    revalidatePath.mockClear();
    const state = await addCommentAction(idle, valid({ body: "c 31", name: "Zed" }));
    expect(state).toMatchObject({
      status: "error",
      message: "Too many comments right now. Please try again in a few minutes.",
      name: "Zed",
      body: "c 31",
    });
    expect(await storedCount()).toBe(30);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("with TRUST_PROXY=1 but no header, the site-wide limit applies (AC10)", async () => {
    process.env.TRUST_PROXY = "1";
    for (let i = 0; i < 30; i++) await addCommentAction(idle, valid({ body: `c ${i}` }));
    expect((await addCommentAction(idle, valid({ body: "c 31" }))).status).toBe("error");
    expect(await storedCount()).toBe(30);
  });

  it("with TRUST_PROXY=1 the 6th from one right-most address is rejected; rotating left entries does not help; another address posts (AC10)", async () => {
    process.env.TRUST_PROXY = "1";
    for (let i = 0; i < 5; i++) {
      requestHeaders.set("x-forwarded-for", `${i}.${i}.${i}.${i}, 7.7.7.7`);
      expect((await addCommentAction(idle, valid({ body: `c ${i}` }))).status).toBe("success");
    }
    requestHeaders.set("x-forwarded-for", "forged, 6.6.6.6, 7.7.7.7");
    const rejected = await addCommentAction(idle, valid({ body: "c 6" }));
    expect(rejected).toMatchObject({ status: "error", message: "Too many comments right now. Please try again in a few minutes." });
    expect(await storedCount()).toBe(5);

    requestHeaders.set("x-forwarded-for", "7.7.7.7, 8.8.8.8");
    expect((await addCommentAction(idle, valid({ body: "c 7" }))).status).toBe("success");
    expect(await storedCount()).toBe(6);
  });

  it("with TRUST_PROXY set to anything but 1, headers are ignored", async () => {
    process.env.TRUST_PROXY = "true";
    for (let i = 0; i < 6; i++) {
      requestHeaders.set("x-forwarded-for", "9.9.9.9");
      expect((await addCommentAction(idle, valid({ body: `c ${i}` }))).status).toBe("success");
    }
    expect(await storedCount()).toBe(6);
  });
});
