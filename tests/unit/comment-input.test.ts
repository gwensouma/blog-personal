import { describe, expect, it } from "vitest";
import { cleanCommentBody, cleanCommentName, validateCommentInput } from "@/lib/comment-input";

// Every character the spec says is stripped, written as escapes so the file stays readable.
// CR is left out: it is converted to a newline before stripping (covered separately).
const C0_EXCEPT_NEWLINE_AND_TAB = Array.from({ length: 0x20 }, (_, i) => i).filter((c) => c !== 0x09 && c !== 0x0a && c !== 0x0d);
const C1 = Array.from({ length: 0x21 }, (_, i) => 0x7f + i).filter((c) => c <= 0x9f); // DEL + C1
const BIDI = [0x061c, 0x200e, 0x200f, ...[0x202a, 0x202b, 0x202c, 0x202d, 0x202e], 0x2066, 0x2067, 0x2068, 0x2069];

describe("cleanCommentName", () => {
  it("trims leading and trailing whitespace", () => {
    expect(cleanCommentName("  Ann  ")).toBe("Ann");
  });

  it("collapses whitespace runs to one space and turns tabs into spaces", () => {
    expect(cleanCommentName("Ann \t  Lee")).toBe("Ann Lee");
  });

  it("removes newlines (and \\r\\n, \\r) from a name", () => {
    expect(cleanCommentName("Ann\nLee")).toBe("AnnLee");
    expect(cleanCommentName("Ann\r\nLee")).toBe("AnnLee");
    expect(cleanCommentName("Ann\rLee")).toBe("AnnLee");
    expect(cleanCommentName("Ann \n Lee")).toBe("Ann Lee");
  });

  it("strips every control and bidi character", () => {
    for (const code of [...C0_EXCEPT_NEWLINE_AND_TAB, ...C1, ...BIDI]) {
      const ch = String.fromCharCode(code);
      expect(cleanCommentName(`a${ch}b`), `U+${code.toString(16)}`).toBe("ab");
    }
  });

  it("applies NFC", () => {
    expect(cleanCommentName("é")).toBe("é");
  });

  it("re-normalises when removing a control joins a letter and a combining mark", () => {
    expect(cleanCommentName("e\u0000́")).toBe("é");
  });

  it("keeps unicode names intact", () => {
    expect(cleanCommentName("Nguyễn Văn An 🎉")).toBe("Nguyễn Văn An 🎉".normalize("NFC"));
  });

  it("a name of only controls or whitespace is empty", () => {
    expect(cleanCommentName(" \t\n\u202E\u0000 ")).toBe("");
  });
});

describe("cleanCommentBody", () => {
  it("trims leading and trailing whitespace including newlines", () => {
    expect(cleanCommentBody("\n\n  hello  \n")).toBe("hello");
  });

  it("converts \\r\\n and \\r to \\n", () => {
    expect(cleanCommentBody("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("converts tabs to spaces but keeps spaces inside a line", () => {
    expect(cleanCommentBody("a\tb  c")).toBe("a b  c");
  });

  it("collapses 3 or more newlines to two, keeps one and two", () => {
    expect(cleanCommentBody("a\nb")).toBe("a\nb");
    expect(cleanCommentBody("a\n\nb")).toBe("a\n\nb");
    expect(cleanCommentBody("a\n\n\nb")).toBe("a\n\nb");
    expect(cleanCommentBody("a\n\n\n\n\n\nb")).toBe("a\n\nb");
    expect(cleanCommentBody("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
  });

  it("strips every control and bidi character but keeps the newline", () => {
    for (const code of [...C0_EXCEPT_NEWLINE_AND_TAB, ...C1, ...BIDI]) {
      const ch = String.fromCharCode(code);
      expect(cleanCommentBody(`a${ch}b`), `U+${code.toString(16)}`).toBe("ab");
    }
    expect(cleanCommentBody("a\nb")).toBe("a\nb");
  });

  it("controls between newlines do not stop the newline collapse from ever being wrong", () => {
    // Stripped first, then the newlines either side become adjacent and collapse.
    expect(cleanCommentBody("a\n\u0007\n\u200E\nb")).toBe("a\n\nb");
  });

  it("applies NFC", () => {
    expect(cleanCommentBody("é")).toBe("é");
  });

  it("a body of only control and bidi characters is empty", () => {
    expect(cleanCommentBody("\u202E\u0007\n\n\u200F\u2066")).toBe("");
  });

  it("passes HTML and URLs through unchanged", () => {
    expect(cleanCommentBody("<b>hi</b>")).toBe("<b>hi</b>");
    expect(cleanCommentBody("https://x.y")).toBe("https://x.y");
    expect(cleanCommentBody("<script>alert(1)</script> & \"q\"")).toBe("<script>alert(1)</script> & \"q\"");
  });

  it("keeps emoji and astral characters", () => {
    expect(cleanCommentBody("hi 🎉👍🏽")).toBe("hi 🎉👍🏽");
  });
});

describe("validateCommentInput: name length", () => {
  const body = "ok";

  it("0 characters is rejected on the name field", () => {
    expect(validateCommentInput("", body)).toMatchObject({ ok: false, field: "name" });
  });

  it("1 character is accepted", () => {
    expect(validateCommentInput("A", body)).toEqual({ ok: true, name: "A", body });
  });

  it("50 characters are accepted", () => {
    expect(validateCommentInput("n".repeat(50), body)).toMatchObject({ ok: true });
  });

  it("51 characters are rejected on the name field", () => {
    expect(validateCommentInput("n".repeat(51), body)).toMatchObject({ ok: false, field: "name" });
  });

  it("whitespace around 50 characters is trimmed before the length check", () => {
    expect(validateCommentInput(`   ${"n".repeat(50)}   `, body)).toMatchObject({ ok: true, name: "n".repeat(50) });
  });

  it("controls inside 51 characters are stripped before the length check", () => {
    expect(validateCommentInput(`${"n".repeat(50)}\u202E\u0000`, body)).toMatchObject({ ok: true });
  });

  it("a whitespace-only or control-only name is rejected as empty", () => {
    expect(validateCommentInput("   \t ", body)).toMatchObject({ ok: false, field: "name" });
    expect(validateCommentInput("\u202E\u200F", body)).toMatchObject({ ok: false, field: "name" });
  });
});

describe("validateCommentInput: body length", () => {
  const name = "Ann";

  it("0 characters is rejected on the body field", () => {
    expect(validateCommentInput(name, "")).toMatchObject({ ok: false, field: "body" });
  });

  it("1 character is accepted", () => {
    expect(validateCommentInput(name, "x")).toEqual({ ok: true, name, body: "x" });
  });

  it("2000 characters are accepted", () => {
    expect(validateCommentInput(name, "b".repeat(2000))).toMatchObject({ ok: true });
  });

  it("2001 characters are rejected on the body field", () => {
    expect(validateCommentInput(name, "b".repeat(2001))).toMatchObject({ ok: false, field: "body" });
  });

  it("trims whitespace before the length check", () => {
    expect(validateCommentInput(name, `  \n${"b".repeat(2000)}\n  `)).toMatchObject({ ok: true });
  });

  it("counts after cleaning: 2001 raw characters with one control are accepted", () => {
    expect(validateCommentInput(name, `${"b".repeat(2000)}\u202E`)).toMatchObject({ ok: true });
  });

  it("\\r\\n counts as one character after cleaning", () => {
    const text = `${"b".repeat(1998)}\r\n${"c"}`; // 2000 after cleaning, 2001 raw
    expect(validateCommentInput(name, text)).toMatchObject({ ok: true });
  });

  it("a body of only control or bidi characters is rejected as empty", () => {
    expect(validateCommentInput(name, "\u202E\u0007\n\n")).toMatchObject({ ok: false, field: "body" });
  });

  it("checks the name first when both are bad", () => {
    expect(validateCommentInput("", "")).toMatchObject({ ok: false, field: "name" });
  });

  it("returns a message for every rejection", () => {
    for (const result of [
      validateCommentInput("", "x"),
      validateCommentInput("n".repeat(51), "x"),
      validateCommentInput("a", ""),
      validateCommentInput("a", "b".repeat(2001)),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("returns the cleaned values, not the raw ones", () => {
    expect(validateCommentInput("  Ann\t\u202ELee ", "a\r\n\r\n\r\nb\u0000")).toEqual({
      ok: true,
      name: "Ann Lee",
      body: "a\n\nb",
    });
  });

  it("<b>hi</b> and https://x.y are stored as typed", () => {
    expect(validateCommentInput("Ann", "<b>hi</b> https://x.y")).toMatchObject({ ok: true, body: "<b>hi</b> https://x.y" });
  });
});
