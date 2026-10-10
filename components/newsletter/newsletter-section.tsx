import { NewsletterForm } from "@/components/newsletter/newsletter-form";
import { cn } from "@/lib/utils";

type NewsletterSectionProps = {
  /** Unique per page, for aria-labelledby. */
  headingId?: string;
  className?: string;
};

// Server Component: heading and copy are static HTML; only the form is a client leaf.
// A hairline rule above it, like every other section boundary.
export function NewsletterSection({ headingId = "newsletter-heading", className }: NewsletterSectionProps) {
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-6 border-t border-border pt-10", className)}>
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="font-heading text-2xl leading-snug font-semibold text-balance sm:text-3xl">
          Get the next post by email
        </h2>
        <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Notes on Server Components, the App Router and shipping less JavaScript, sent when they&rsquo;re written.
        </p>
      </div>
      <NewsletterForm />
    </section>
  );
}
