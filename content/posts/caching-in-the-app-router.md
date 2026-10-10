---
title: Caching in the App Router, untangled
date: 2026-05-02
excerpt: Request memoization, the data cache and the full route cache, explained with one blog page.
tags: [Caching, App Router, Performance]
---

The App Router has several caching layers. They are easier to reason about when you follow a single request.

## Request memoization

Within one render, identical calls can be deduplicated with React's `cache()`. A page and its `generateMetadata` can both call `getPost(slug)` and the data is loaded once.

```ts
import { cache } from "react";

export const getPost = cache(async (slug: string) => {
  return db.post.findUnique({ where: { slug } });
});
```

## Full route cache

Routes without dynamic inputs are rendered at build time. `generateStaticParams` extends that to dynamic segments such as `/posts/[slug]`.

## Opting out

Reading `searchParams`, cookies or headers makes a route dynamic. That is fine for search pages; just know which routes you are paying for at request time.
