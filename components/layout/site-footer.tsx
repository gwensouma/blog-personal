import Link from "next/link";
import { RssIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

const linkClass =
  "rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="self-start rounded-sm font-heading text-sm font-semibold tracking-widest text-primary uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {site.name}
          </Link>
          <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
            Written by{" "}
            <Link
              href={site.author.url}
              className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {site.author.name}
            </Link>
            . {site.author.bio}
          </p>
        </div>

        <nav aria-labelledby="footer-nav-heading" className="flex flex-col gap-3">
          <h2 id="footer-nav-heading" className="font-heading text-sm font-semibold">
            Journal
          </h2>
          <ul className="flex flex-col gap-2">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/search" className={linkClass}>
                Search
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-sm font-semibold">Elsewhere</h2>
          <ul className="flex flex-col gap-2">
            {site.social.map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="me noopener noreferrer" target="_blank" className={linkClass}>
                  {link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href="/feed.xml" className={cn(linkClass, "inline-flex items-center gap-1.5")}>
                <RssIcon aria-hidden="true" className="size-3.5" />
                RSS feed
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-5xl px-6 py-6 text-xs text-muted-foreground">
          &copy; {year} {site.author.name}. Built with React Server Components.
        </p>
      </div>
    </footer>
  );
}
