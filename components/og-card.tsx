import { coverGlowPositions, type CoverTone, type CoverVariant } from "@/lib/cover-variant";
import { OG_FONT_FAMILY } from "@/lib/og";

// Layout for next/og social images (rendered by Satori, not the browser).
// Exception to the token rule: Satori can't read CSS variables or Tailwind classes,
// so the light-theme tokens from app/globals.css are mirrored here once, as literal
// sRGB values (Satori has no oklch()), and every style below references this object.
export const OG_COLORS = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#1d4ed8",
  mutedForeground: "#5b6472",
  border: "#e2e6ec",
  /** --brand family: the default cover fields. */
  brand: "#1d4ed8",
  brandDeep: "#132d94", // oklch(0.36 0.17 266)
  brandInk: "#091955", // oklch(0.25 0.11 266)
  brandSoft: "#dbe9ff", // oklch(0.93 0.035 262)
  brandSoftForeground: "#132d94", // oklch(0.36 0.17 266)
  brandForeground: "#fbfbfb", // oklch(0.985 0 0)
} as const;

/** `rgba()` of a 6-digit hex color, for translucent glows and hairlines. */
function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const ogSize = { width: 1200, height: 630 };

/** Width of the cover panel on the right edge of the card (full height). */
export const ogCoverSize = { width: 420, height: ogSize.height };

/** A real image (URL or data URI), or the default cover with the post's look from lib/cover-variant.ts. */
export type OgCover =
  | { kind: "image"; src: string }
  | { kind: "default"; variant: CoverVariant; issue: number; tag?: string };

/** The panel sits below the 16px top rule. */
const PANEL = { width: ogCoverSize.width, height: ogCoverSize.height - 16 };
const PAD = 32;

// Mirrors toneClass in components/posts/post-cover.tsx (light theme).
const toneStyle: Record<CoverTone, { field: string; glow: string; glowAlpha: number; text: string }> = {
  deep: {
    field: `linear-gradient(160deg, ${OG_COLORS.brand}, ${OG_COLORS.brandDeep})`,
    glow: OG_COLORS.brandForeground,
    glowAlpha: 0.18,
    text: OG_COLORS.brandForeground,
  },
  ink: {
    field: `linear-gradient(200deg, ${OG_COLORS.brandDeep}, ${OG_COLORS.brandInk})`,
    glow: OG_COLORS.brand,
    glowAlpha: 0.8,
    text: OG_COLORS.brandForeground,
  },
  soft: {
    field: `linear-gradient(160deg, ${OG_COLORS.brandSoft}, ${OG_COLORS.brandSoft})`,
    glow: OG_COLORS.brand,
    glowAlpha: 0.2,
    text: OG_COLORS.brandSoftForeground,
  },
};

// Same treatment as the site header wordmark: Fraunces semibold, uppercase, widest tracking.
const wordmarkStyle = {
  display: "flex",
  fontFamily: OG_FONT_FAMILY.heading,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  lineHeight: 1,
} as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Satori sizes absolutely positioned boxes unreliably from insets and padding, so each
// layer is an explicit box: the full panel, or the panel minus PAD on every side.
const layer = { position: "absolute", top: 0, left: 0, width: PANEL.width, height: PANEL.height, display: "flex" } as const;
const inner = { position: "absolute", top: PAD, left: PAD, width: PANEL.width - 2 * PAD, height: PANEL.height - 2 * PAD, display: "flex" } as const;

// Large "No. 04" bleeding off the bottom right. In the portrait panel the tag sits
// under the wordmark (top left) instead of bottom left, so it never runs into the number.
function OgNumberComposition({ siteName, issue, tag }: { siteName: string; issue: number; tag?: string }) {
  return (
    <div style={layer}>
      <div style={{ ...inner, flexDirection: "column", gap: 16 }}>
        <div style={{ ...wordmarkStyle, fontSize: 20 }}>{siteName}</div>
        {tag ? <div style={{ display: "flex", fontSize: 24, opacity: 0.8 }}>{tag}</div> : null}
      </div>
      <div style={{ ...layer, alignItems: "flex-end", justifyContent: "flex-end" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginRight: 20,
            marginBottom: -44,
            fontFamily: OG_FONT_FAMILY.heading,
            fontWeight: 600,
            fontSize: 240,
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          <div style={{ display: "flex", marginTop: 40, marginRight: 8, fontSize: 46, fontWeight: 400, letterSpacing: 0, opacity: 0.8 }}>
            No.
          </div>
          <div style={{ display: "flex" }}>{pad2(issue)}</div>
        </div>
      </div>
    </div>
  );
}

/** Large tag size that keeps the longest word inside the panel (0.56em per letter: a little wider than
 * Fraunces' average, so "Components" still clears the padding). maxWidth on the box is the backstop. */
function tagFontSize(tag: string): number {
  const longest = Math.max(...tag.split(/\s+/).map((word) => word.length));
  return Math.min(76, Math.floor((PANEL.width - 2 * PAD) / (longest * 0.56)));
}

// The tag set large in Fraunces, bottom left; wordmark and issue number small on top.
function OgTagComposition({ siteName, issue, tag }: { siteName: string; issue: number; tag: string }) {
  return (
    <div style={{ ...inner, flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ ...wordmarkStyle, fontSize: 20 }}>{siteName}</div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.8 }}>{`No. ${pad2(issue)}`}</div>
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: PANEL.width - 2 * PAD,
          overflow: "hidden",
          fontFamily: OG_FONT_FAMILY.heading,
          fontWeight: 400,
          fontSize: tagFontSize(tag),
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
        }}
      >
        {tag}
      </div>
    </div>
  );
}

// The centered mark: wordmark, hairline, tag.
function OgMarkComposition({ siteName, tag, color }: { siteName: string; tag?: string; color: string }) {
  return (
    <div style={{ ...layer, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ ...wordmarkStyle, fontSize: 30 }}>{siteName}</div>
      {tag ? <div style={{ display: "flex", width: 32, height: 2, backgroundColor: alpha(color, 0.5) }} /> : null}
      {tag ? <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.025em", opacity: 0.8 }}>{tag}</div> : null}
    </div>
  );
}

// Same field, glow and compositions as DefaultCover in components/posts/post-cover.tsx,
// minus the grain (Satori can't render SVG filters).
function OgDefaultCover({ siteName, cover }: { siteName: string; cover: Extract<OgCover, { kind: "default" }> }) {
  const { composition, tone, glow } = cover.variant;
  const t = toneStyle[tone];
  const at = coverGlowPositions[glow];

  return (
    <div
      style={{
        ...PANEL,
        position: "relative",
        display: "flex",
        overflow: "hidden",
        color: t.text,
        backgroundColor: OG_COLORS.brand,
        backgroundImage: `radial-gradient(ellipse at ${at.x}% ${at.y}%, ${alpha(t.glow, t.glowAlpha)}, ${alpha(t.glow, 0)} 60%), ${t.field}`,
      }}
    >
      {composition === "number" ? <OgNumberComposition siteName={siteName} issue={cover.issue} tag={cover.tag} /> : null}
      {composition === "tag" && cover.tag ? <OgTagComposition siteName={siteName} issue={cover.issue} tag={cover.tag} /> : null}
      {composition === "mark" ? <OgMarkComposition siteName={siteName} tag={cover.tag} color={t.text} /> : null}
    </div>
  );
}

type OgCardProps = {
  siteName: string;
  title: string;
  description?: string;
  meta?: string;
  /** Shown in a full-height panel on the right. */
  cover?: OgCover;
};

export function OgCard({ siteName, title, description, meta, cover }: OgCardProps) {
  const titleSize = cover ? (title.length > 50 ? 52 : 64) : title.length > 60 ? 60 : 72;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: OG_FONT_FAMILY.sans,
        borderTop: `16px solid ${OG_COLORS.primary}`,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: cover ? "64px 64px 64px 80px" : "72px 80px",
        }}
      >
        <div style={{ ...wordmarkStyle, fontSize: 26, color: OG_COLORS.primary }}>{siteName}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Satori clamps lines only on display: block. Caps keep the meta rule on the card. */}
          <div
            style={{
              display: "block",
              lineClamp: 3,
              fontFamily: OG_FONT_FAMILY.heading,
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ display: "block", lineClamp: 2, fontSize: cover ? 26 : 30, lineHeight: 1.4, color: OG_COLORS.mutedForeground, maxWidth: 940 }}>
              {description}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: OG_COLORS.mutedForeground,
            borderTop: `2px solid ${OG_COLORS.border}`,
            paddingTop: 28,
          }}
        >
          {meta ?? ""}
        </div>
      </div>
      {cover?.kind === "image" ? (
        // Satori renders plain <img> only (no next/image).
        <img
          src={cover.src}
          alt=""
          width={PANEL.width}
          height={PANEL.height}
          style={{ ...PANEL, objectFit: "cover", borderLeft: `2px solid ${OG_COLORS.border}` }}
        />
      ) : cover?.kind === "default" ? (
        <OgDefaultCover siteName={siteName} cover={cover} />
      ) : null}
    </div>
  );
}
