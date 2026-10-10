import { useId } from "react";
import Image from "next/image";
import { Parallax } from "@/components/motion/parallax";
import { pickCoverVariant, type CoverTone } from "@/lib/cover-variant";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

type CoverAspect = "3/1" | "2/1" | "16/9" | "3/2" | "4/3" | "1/1" | "3/4";
type CoverSize = "thumb" | "card" | "hero";

type PostCoverProps = {
  post: Pick<PostSummary, "slug" | "issue" | "tags" | "cover">;
  /** Position in the rendered list (rows, deck). When set, the default cover's look is
   * picked from it instead of the issue number, so neighbours in that list always differ. */
  variant?: number;
  /** Frame ratio. Real images are cropped to it (object-cover) so layouts never shift. */
  aspect?: CoverAspect;
  /** Rendered size: picks `sizes` for real images. The default cover scales with its frame. */
  size?: CoverSize;
  priority?: boolean;
  /** The cover repeats a title link next to it (list rows, cards): a real image gets alt="". */
  decorative?: boolean;
  /** Scroll parallax on the contents (client wrapper). For large covers only. */
  parallax?: boolean;
  /** Classes for the moving contents inside the fixed frame, e.g. a hover zoom. */
  contentClassName?: string;
  className?: string;
};

const aspectClass: Record<CoverAspect, string> = {
  "3/1": "aspect-[3/1]",
  "2/1": "aspect-[2/1]",
  "16/9": "aspect-video",
  "3/2": "aspect-[3/2]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

const imageSizes: Record<CoverSize, string> = {
  thumb: "160px",
  card: "(min-width: 640px) 360px, 100vw",
  hero: "(min-width: 768px) 720px, 100vw",
};

// Entrance: the contents settle from a slight zoom inside the fixed frame (CSS
// only, so it runs on first paint without waiting for hydration).
const settle =
  "motion-safe:animate-in motion-safe:zoom-in-[1.08] motion-safe:duration-1000 motion-safe:ease-out-expo";

// --- Default cover variations -------------------------------------------------
// Every post gets a deterministic look so a list of default covers never reads as
// one blue block repeated. The pick (composition, tone, glow corner) lives in
// lib/cover-variant.ts, shared with the OG card. Every thumbnail keeps a
// post-specific main mark ("No. xx" or the tag): below 12rem the centered `mark`
// layout swaps to the tag (or number) layout.
// Everything stays inside the primary hue. Rationale: .design/blog-refactor.md.

const toneClass: Record<CoverTone, { field: string; glow: string; grain: string; text: string }> = {
  deep: {
    field: "bg-linear-160 from-brand to-brand-deep",
    glow: "from-brand-foreground/18",
    grain: "opacity-30 mix-blend-overlay",
    text: "text-brand-foreground",
  },
  ink: {
    field: "bg-linear-200 from-brand-deep to-brand-ink",
    glow: "from-brand/80 dark:from-brand/40",
    grain: "opacity-30 mix-blend-overlay",
    text: "text-brand-foreground",
  },
  soft: {
    field: "bg-linear-160 from-brand-soft to-brand-soft",
    glow: "from-brand/20",
    grain: "opacity-15 mix-blend-multiply dark:mix-blend-overlay dark:opacity-30",
    text: "text-brand-soft-foreground",
  },
};

// Same order as coverGlowPositions (static class strings so Tailwind sees them).
const glowClass = [
  "bg-radial-[at_18%_12%]",
  "bg-radial-[at_84%_14%]",
  "bg-radial-[at_16%_86%]",
  "bg-radial-[at_82%_88%]",
];

// Inside a Parallax layer the cover is taller than its frame; `--cover-overhang`
// (set by the layer) keeps labels and the bleeding number inside the visible part.

/** Small labels drop out once the cover is thumbnail-sized; the main mark stays. */
const smallLabel = "@max-[12rem]:hidden";

function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-[length:clamp(0.5625rem,2.3cqi,0.875rem)] leading-none font-semibold tracking-widest whitespace-nowrap uppercase",
        className,
      )}
    >
      {site.name}
    </span>
  );
}

function IssueNumber({ number, className }: { number: number; className?: string }) {
  return <span className={cn("font-heading leading-none tabular-nums", className)}>{String(number).padStart(2, "0")}</span>;
}

// Large "No. 04" bleeding off the bottom right; wordmark top left, tag bottom left.
function NumberComposition({ number, tag }: { number: number; tag?: string }) {
  return (
    <>
      <div className="absolute inset-0 flex flex-col items-start px-[max(6cqi,0.75rem)] py-[calc(max(6cqi,0.75rem)+var(--cover-overhang,0px))]">
        <Wordmark className={smallLabel} />
        {tag ? <span className={cn("mt-auto text-[length:clamp(0.625rem,2.2cqi,0.9375rem)] opacity-80", smallLabel)}>{tag}</span> : null}
      </div>
      {/* Bleeds off the bottom edge on large covers; sits fully inside on thumbnails. */}
      <span className="absolute right-[5cqi] bottom-[var(--cover-overhang,0px)] flex translate-y-[16%] items-start @max-[12rem]:right-[max(6cqi,0.625rem)] @max-[12rem]:bottom-[max(4cqi,0.375rem)] @max-[12rem]:translate-y-0 gap-[0.04em] text-[length:min(62cqh,40cqi)] font-semibold tracking-tight">
        <span className="mt-[0.16em] font-heading text-[0.2em] leading-none font-medium tracking-normal opacity-80">No.</span>
        <IssueNumber number={number} />
      </span>
    </>
  );
}

// The tag set large in Fraunces, bottom left; wordmark and issue number small on top.
function TagComposition({ number, tag }: { number: number; tag: string }) {
  return (
    <div className="absolute inset-0 flex flex-col px-[max(6cqi,0.75rem)] py-[calc(max(6cqi,0.75rem)+var(--cover-overhang,0px))]">
      <div className={cn("flex items-baseline justify-between gap-4", smallLabel)}>
        <Wordmark />
        <span className="text-[length:clamp(0.625rem,2.2cqi,0.9375rem)] tabular-nums opacity-80">
          No. {String(number).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-auto max-w-[88%] font-heading text-[length:clamp(0.875rem,min(11cqi,26cqh),4.5rem)] leading-[0.95] font-medium tracking-tight text-balance [overflow-wrap:anywhere]">
        {tag}
      </span>
    </div>
  );
}

// The original centered mark: wordmark, hairline, tag.
function MarkComposition({ tag }: { tag?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2cqi]">
      <Wordmark className="text-[length:clamp(0.625rem,3.4cqi,1.625rem)]" />
      {tag ? (
        <>
          <span className={cn("h-px w-[5cqi] min-w-4 bg-current opacity-50", smallLabel)} />
          <span className={cn("text-[length:clamp(0.625rem,2cqi,0.9375rem)] tracking-wide opacity-80", smallLabel)}>{tag}</span>
        </>
      ) : null}
    </div>
  );
}

// The default cover: a tonal field in the primary hue with a soft glow, a fine
// grain and one of three typographic compositions. Decoration until real images
// exist, so it is aria-hidden.
function DefaultCover({ post, variant, className }: { post: PostCoverProps["post"]; variant?: number; className?: string }) {
  const tag = post.tags[0];
  const { issue } = post;
  const { composition, tone: toneName, glow } = pickCoverVariant(post, variant);
  const tone = toneClass[toneName];
  // The same post can appear twice on a page (deck and list), so the filter id must be unique per instance.
  const grainId = `cover-grain-${useId()}`;

  return (
    <div aria-hidden="true" className={cn("absolute inset-0 [container-type:size]", tone.text, className)}>
      <div className={cn("absolute inset-0", tone.field)} />
      {/* A soft light keeps the field from reading flat; its position varies per post. */}
      <div className={cn("absolute inset-0 to-transparent to-60%", glowClass[glow], tone.glow)} />
      <svg className={cn("absolute inset-0 size-full", tone.grain)} focusable="false">
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>
      {composition === "number" ? <NumberComposition number={issue} tag={tag} /> : null}
      {composition === "tag" && tag ? <TagComposition number={issue} tag={tag} /> : null}
      {composition === "mark" ? (
        <>
          <div className="@max-[12rem]:hidden">
            <MarkComposition tag={tag} />
          </div>
          <div className="hidden @max-[12rem]:block">
            {tag ? <TagComposition number={issue} tag={tag} /> : <NumberComposition number={issue} />}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Server Component: the real cover image when frontmatter sets one, otherwise
// the default branded cover. No client JS unless `parallax` is set.
export function PostCover({
  post,
  variant,
  aspect = "2/1",
  size = "hero",
  priority = false,
  decorative = false,
  parallax = false,
  contentClassName,
  className,
}: PostCoverProps) {
  const frame = cn("relative isolate overflow-hidden rounded-lg bg-muted", aspectClass[aspect], className);

  const content = post.cover ? (
    <Image
      src={post.cover.src}
      alt={decorative ? "" : post.cover.alt}
      fill
      sizes={imageSizes[size]}
      priority={priority}
      placeholder={post.cover.blurDataURL ? "blur" : "empty"}
      blurDataURL={post.cover.blurDataURL}
      className={cn("object-cover", settle, contentClassName)}
    />
  ) : (
    <DefaultCover post={post} variant={variant} className={cn(settle, contentClassName)} />
  );

  return (
    <div className={cn(frame, !post.cover && "bg-brand")}>
      {parallax ? <Parallax className="[--cover-overhang:6.9cqh]">{content}</Parallax> : content}
      {/* Hairline edge: keeps dark tones distinct from a dark page. */}
      {post.cover ? null : <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-brand-foreground/10 ring-inset" />}
    </div>
  );
}
