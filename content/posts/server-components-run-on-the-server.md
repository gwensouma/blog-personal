---
title: Server Components run on the server
date: 2026-08-10
excerpt: Why a component that never ships to the browser changes how you fetch data, keep secrets and size your bundle.
tags: [Server Components, Fundamentals]
featured: true
---

A Server Component is a React component that renders **only on the server**. Its code is never sent to the browser as JavaScript, which unlocks a few things that used to need an API layer.

## What actually runs where

When a request comes in, React renders the Server Component tree on the server and produces a serialized description of the UI, the *RSC payload*. The browser receives that payload plus HTML, never the component source.

- Data access can happen inline, right next to the markup that uses it.
- Secrets such as API keys stay on the server.
- Large dependencies (Markdown parsers, syntax highlighters) cost the user nothing.

## Fetching data without an API route

Because the component runs on the server, it can be `async` and await data directly:

```tsx
import { getPosts } from "@/lib/data/posts";

export default async function Page() {
  const posts = await getPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>{post.title}</li>
      ))}
    </ul>
  );
}
```

No `useEffect`, no loading flag, no client-side fetch waterfall.

### Keeping it server-only

Mark modules that must never reach the client with the `server-only` package. If a Client Component imports them by accident, the build fails instead of leaking code.

## What you give up

Server Components cannot use state, effects or browser APIs. That is the point: interactivity is pushed down into small Client Components at the leaves of the tree.

> Default to the server. Opt into the client only where a user can click, type or drag.
