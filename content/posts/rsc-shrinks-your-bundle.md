---
title: RSC helps shrink the JavaScript sent to the browser
date: 2026-08-20
excerpt: Only the Client Component parts ship JavaScript. Here is how to measure the difference.
tags: [Performance, Server Components]
---

Every Server Component is a component whose JavaScript never reaches the user. On a content-heavy site that adds up quickly.

## Measuring it

Run a production build and read the route table:

```bash
npm run build
```

Next.js prints the *First Load JS* for every route. Move a heavy dependency from a Client Component into a Server Component and watch the number drop.

## Typical wins

| Dependency | Where it used to run | Where it runs now |
| --- | --- | --- |
| Markdown parser | Browser | Server |
| Syntax highlighter | Browser | Server |
| Date library | Browser | Server |

## The trade-off

Server rendering moves work to your infrastructure. For most blogs and dashboards that is a good trade: servers are fast and predictable, phones on slow networks are not.
