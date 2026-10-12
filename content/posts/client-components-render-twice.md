---
title: Client Components render on both server and client
date: 2026-08-15
excerpt: A "use client" component is still rendered to HTML on the server first, then hydrated in the browser.
tags: [Client Components, Fundamentals, Hydration]
series: RSC Fundamentals
seriesOrder: 2
---

The name is misleading. A Client Component, marked with `"use client"`, is **also rendered on the server**. The difference is that its code is shipped to the browser so it can be hydrated and become interactive.

## The two passes

1. On the server, React renders the component to HTML so the first paint is fast.
2. In the browser, React downloads the component code and *hydrates* the HTML, attaching event handlers and state.

## Where the boundary goes

`"use client"` marks a boundary, not a single file. Everything imported by that module becomes part of the client bundle.

```tsx
"use client";

import { useState } from "react";

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => setLiked(!liked)} aria-pressed={liked}>
      {liked ? "Liked" : "Like"}
    </button>
  );
}
```

Keep the boundary as low in the tree as possible. A page can stay a Server Component and render this button as one small leaf.

## Passing Server Components as children

A Client Component cannot import a Server Component, but it can *receive* one as `children`. That lets an interactive shell, such as a tab panel, wrap server-rendered content without turning it into client code.
