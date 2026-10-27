import Link from "next/link";
import { RssIcon } from "lucide-react";
import { AuthorAvatar } from "@/components/authors/author-avatar";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";
import type { AuthorAvatar as AuthorAvatarData } from "@/types/author";

// Body of the /about page: who writes this journal, what it covers, where else to find it.
export function AuthorAbout({ avatar }: { avatar: AuthorAvatarData | null }) {
  return (
    <div className="flex flex-col gap-12 text-lg/8">
      <section aria-labelledby="author-heading" className="flex flex-col gap-4">
        <div className="flex items-center gap-5 sm:gap-6">
          <AuthorAvatar avatar={avatar} />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="author-heading" className="font-heading text-2xl font-semibold">
              {site.author.name}
            </h2>
            <p className="text-sm tracking-wide text-muted-foreground">{site.author.role}</p>
          </div>
        </div>
        <p>{site.author.bio}</p>
      </section>

      <section aria-labelledby="topics-heading" className="flex flex-col gap-4">
        <h2 id="topics-heading" className="font-heading text-2xl font-semibold">
          What this journal covers
        </h2>
        <p>
          Short, practical notes on React Server Components and the Next.js App Router: where the server/client
          boundary should sit, how streaming and caching behave, and how much JavaScript a page really needs.
        </p>
        <p>
          Each post starts from a small experiment on this very site. The blog itself is the test bed: pages render on
          the server, and only a few small leaves, like the like button and the theme toggle, ship code to the browser.
        </p>
        <p>
          Start with the{" "}
          <Link href="/posts" className="rounded-sm text-primary underline decoration-primary/40 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50">
            archive
          </Link>{" "}
          or{" "}
          <Link href="/tags" className="rounded-sm text-primary underline decoration-primary/40 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50">
            browse by tag
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="elsewhere-heading" className="flex flex-col gap-4">
        <h2 id="elsewhere-heading" className="font-heading text-2xl font-semibold">
          Elsewhere
        </h2>
        <ul className="flex flex-wrap gap-2">
          {site.social.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="me noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                {link.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
          <li>
            <a href="/feed.xml" className={buttonVariants({ variant: "outline" })}>
              <RssIcon data-icon="inline-start" aria-hidden="true" />
              RSS feed
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
