// Single source of truth for site-wide identity. Header, footer, metadata,
// RSS, sitemap and JSON-LD all read from here.
export const site = {
  name: "RSC Journal",
  description: "Short notes on React Server Components: render on the server, ship less JS to the browser.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  author: {
    name: "An Nguyen",
    role: "Frontend engineer",
    bio: "I write about React Server Components, the App Router and the craft of shipping less JavaScript. This journal is where I learn in public.",
    url: "/about",
    /** Photo under public/. Used on /about once the file exists; until then a monogram shows. */
    avatar: "/images/avatar.jpg" as string | undefined,
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/posts", label: "Archive" },
    { href: "/tags", label: "Tags" },
    { href: "/about", label: "About" },
  ],
  social: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "X", href: "https://x.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
  ],
  postsPerPage: 5,
} as const;

export type NavItem = (typeof site.nav)[number];

/** Resolves a site-relative path ("/posts/foo") to an absolute URL. */
export function absoluteUrl(path: string = "/"): string {
  return new URL(path, site.url).toString();
}
