# Product overview

What the blog is **today**: its readers, its pages and what each page must do. Plans live in
[roadmap.md](roadmap.md), feature specs in [specs/](specs/). A sprint that adds or changes a page updates this file in
the same PR (checked in the lead check). Each criterion is meant to be checked by a test or by eye; "no JS" means the
page in a browser with JavaScript disabled.

## What it is

A personal learning journal about React Server Components, built with them: posts are Markdown files in
`content/posts/`, and likes, views, comments and newsletter sign-ups go to a small JSON-file store. One author, no accounts.

## Readers

<!-- For the user to fill in: who reads it, what they come for, what they should leave with. -->

-

## Pages

### Home `/`
- Shows the intro, the featured post, the latest posts, the topics and the newsletter form.
- "Most read" appears once any post has views, and lists posts by view count.
- No JS: every section above is visible.

### Archive `/posts`
- Lists every post newest first under year headings, 5 per page, with numbered pagination.
- `?page=2` marks a year carried over from page 1 as continued; an out-of-range or malformed page is a 404.
- No JS: the list and pagination work.

### Post `/posts/[slug]`
- Shows cover, title, meta (date, reading time, tags), the body with highlighted code, and a table of contents.
- Ends with likes and views, share links, an **Up next** card (the next series part, else the most related post,
  else the newer or older post), the newsletter, prev/next and related posts; a post appears at most once in this
  ending. When in a series: the series box at the top and a series nav back to the previous part (none on part 1).
- A **Comments** section after the article and before Up next: readers post a name and a plain-text body (no
  account); a comment shows at once, oldest first, and the meta shows the count ("3 comments") linking to it.
  Lengths, a per-post cap and rate limits are enforced on the server.
- An unknown slug is a 404. No JS: the body, series box and nav, the Up next card, related posts and prev/next
  are visible, and comments post (full-page POST) and show; like, copy buttons and the TOC highlight need JS.

### Tags `/tags` and `/tags/[tag]`
- `/tags` lists every tag with its post count, most used first.
- `/tags/[tag]` lists that tag's posts newest first with a link back to all tags; an unknown tag is a 404.
- No JS: both pages are complete.

### Search `/search`
- `?q=` finds posts by title, excerpt, tags and body, with matches highlighted in `<mark>`.
- `?tag=` narrows results to a topic; filter chips show the topics found. Result pages are `noindex`.
- No JS: the form submits as a GET and keeps the active topic.

### About `/about`
- Shows the author, avatar and what the journal covers, with Person JSON-LD.
- No JS: complete.

### Site-wide
- Header with nav, theme toggle and ⌘K command palette (JS); a mobile nav sheet; footer; skip link; back-to-top.
- Newsletter form (Server Action) on home and post pages: subscribes without JS by a full-page POST, with JS in place.
- `/feed.xml` (RSS), `/sitemap.xml`, `/robots.txt`, Open Graph images for the site and each post, JSON-LD.
- Not found: a custom 404 page with a way back.
- Motion respects `prefers-reduced-motion`; layouts work at 320, 768 and 1280 px, in light and dark.

## Non-goals (for now)

- Accounts, sign-in, or more than one author.
- AI features (`lib/ai/`), a database or CMS, deploying or hosting: postponed by the user (see the roadmap).
- Client-side data fetching or a state library: Server Components and URL params instead.
- Analytics beyond the post view counter.
