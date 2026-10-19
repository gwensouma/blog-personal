import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DeckGlow, DriftBackdrop } from "@/components/motion/drift-backdrop";
import { Enter } from "@/components/motion/enter";
import { TextReveal } from "@/components/motion/text-reveal";
import { LatestCoverDeck } from "@/components/posts/cover-deck";
import { linkSweepClassName } from "@/lib/motion";
import { site } from "@/lib/site";

// The home page intro. Server Component; every entrance here is CSS (title word by
// word, then the dek and intro) over a drifting backdrop, so it animates on first
// paint without waiting for hydration and reads fine without JS.
// From md up, a deck of the latest covers sits beside the title as the visual
// anchor. The deck is an async Server Component rendered inline, so it is in the
// prerendered HTML and visible without JS. A static primary glow sits behind the
// deck only (inside its own wrapper), never behind the title, dek or intro, so the
// measured muted-text contrast is unchanged.
export function HomeHero() {
  return (
    <div className="relative isolate md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-12">
      <DriftBackdrop className="-inset-x-24 -top-28 -bottom-16 sm:-inset-x-40" />
      <PageHeader
        title={<TextReveal text="Notes on React Server Components" />}
        description={<Enter delay={420}>Render on the server, ship less JavaScript to the browser.</Enter>}
        className="pb-0"
      >
        <Enter delay={560}>
          <p className="max-w-[58ch] text-base text-muted-foreground">
            A learning journal by{" "}
            <Link href={site.author.url} className={linkSweepClassName}>
              {site.author.name}
            </Link>
            , {site.author.role.toLowerCase()}. Small experiments with the App Router, written up as I go.
          </p>
        </Enter>
      </PageHeader>
      <div className="relative hidden pt-2 md:block">
        <DeckGlow />
        <LatestCoverDeck />
      </div>
    </div>
  );
}
