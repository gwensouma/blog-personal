import Link from "next/link";
import { AutoHideHeader } from "@/components/layout/auto-hide-header";
import { CommandMenu } from "@/components/layout/command-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getPostIndex } from "@/lib/data/posts";
import { site } from "@/lib/site";

// Server Component: only NavLink, CommandMenu, ThemeToggle, MobileNav and the
// AutoHideHeader shell ship JS. The translucent background + blur keeps it legible over content.
export function SiteHeader() {
  return (
    <AutoHideHeader className="border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="rounded-sm font-heading text-sm font-semibold tracking-widest whitespace-nowrap text-primary uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {site.name}
        </Link>

        <div className="flex items-center gap-1 md:gap-6">
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            {/* The post index is passed as an unawaited promise: the header renders at once and
                the index streams in behind it; the palette reads it with use() when opened. */}
            <CommandMenu index={getPostIndex()} />
            <ThemeToggle />
            <MobileNav items={site.nav} />
          </div>
        </div>
      </div>
    </AutoHideHeader>
  );
}
