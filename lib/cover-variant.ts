// Picks the look of a post's default cover. Pure: shared by the React cover
// (components/posts/post-cover.tsx) and the Satori OG card (components/og-card.tsx),
// so a post's OG image matches the cover it has on the site.
//
// - Standalone covers (featured, post page, prev/next, OG image) rotate on the issue
//   number n: composition = n mod 3, tone = (n + floor(n / 3)) mod 3.
// - Covers in a list (rows, related, hero deck) pass their list position i instead:
//   composition alternates number/tag (i mod 2) and tone cycles (i mod 3), so
//   neighbours differ in both as rendered, whatever was filtered out of the list.
// - The glow corner comes from a slug hash.
// Rationale: .design/blog-refactor.md ("Default cover variations").

export type CoverComposition = "number" | "tag" | "mark";
export type CoverTone = "deep" | "soft" | "ink";

/** Glow corners as percentages of the cover (x, y), in the same order everywhere. */
export const coverGlowPositions = [
  { x: 18, y: 12 },
  { x: 84, y: 14 },
  { x: 16, y: 86 },
  { x: 82, y: 88 },
] as const;

export type CoverVariant = {
  composition: CoverComposition;
  tone: CoverTone;
  /** Index into `coverGlowPositions`. */
  glow: number;
};

const compositions: CoverComposition[] = ["number", "tag", "mark"];
const tones: CoverTone[] = ["deep", "ink", "soft"];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function pickCoverVariant(
  post: { slug: string; issue: number; tags: string[] },
  /** Position in a rendered list; omit for standalone covers. */
  listPosition?: number,
): CoverVariant {
  const { issue } = post;
  const listed = listPosition !== undefined;
  const tone = tones[listed ? listPosition % 3 : (issue + Math.floor(issue / 3)) % 3];
  let composition: CoverComposition = listed
    ? listPosition % 2 === 0
      ? "number"
      : "tag"
    : compositions[issue % compositions.length];
  if (composition === "tag" && !post.tags[0]) composition = "number";
  return { composition, tone, glow: hash(post.slug) % coverGlowPositions.length };
}
