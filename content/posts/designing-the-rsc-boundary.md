---
title: Designing the server/client boundary
date: 2025-12-09
excerpt: A practical checklist for deciding which components need "use client".
tags: [Architecture, Client Components, Server Components]
---

Most components in a content site do not need to be interactive. Start every component as a Server Component and ask a few questions before adding `"use client"`.

## The checklist

1. Does it use state or effects?
2. Does it attach event handlers?
3. Does it read browser-only APIs such as `window` or `localStorage`?

If every answer is no, it stays on the server.

## Push the boundary down

When a card needs a like button, do not convert the card. Extract the button:

```tsx
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article>
      <h2>{post.title}</h2>
      <LikeButton />
    </article>
  );
}
```

## Serializable props only

Props crossing the boundary must be serializable: strings, numbers, plain objects, arrays, dates. Functions cannot cross, except Server Actions.
