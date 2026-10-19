---
title: Caching in the App Router, untangled
date: 2026-05-02
excerpt: Request memoization, the data cache and the full route cache, explained with one blog page.
tags: [Caching, App Router, Performance]
cover:
  src: /images/posts/caching-in-the-app-router.webp
  alt: Three nested open boxes with a single thin thread passing straight through all of them
---

The App Router has several caching layers. They are easier to reason about when you follow a single request.

## Request memoization

Within one render, identical calls can be deduplicated with React's `cache()`. A page and its `generateMetadata` can both call `getPost(slug)` and the data is loaded once.[^memo]

```ts
import { cache } from "react";

export const getPost = cache(async (slug: string) => {
  return db.post.findUnique({ where: { slug } });
});
```

> [!IMPORTANT]
> `cache()` only lasts for one server request. It deduplicates work inside a render; it does not keep data between visitors. Persisting data across requests is the job of the data cache.

## Full route cache

Routes without dynamic inputs are rendered at build time. `generateStaticParams` extends that to dynamic segments such as `/posts/[slug]`.

## Opting out

Reading `searchParams`, cookies or headers makes a route dynamic. That is fine for search pages; just know which routes you are paying for at request time.

> [!CAUTION]
> A single `cookies()` call deep in a shared component makes every route that renders it dynamic. Read request data as close to the page that needs it as you can.

[^memo]: `fetch` calls with the same URL and options are memoized automatically. Wrapping a function in `cache()` gives database or file-system reads the same treatment.
