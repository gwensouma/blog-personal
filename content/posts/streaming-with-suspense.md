---
title: Streaming pages with Suspense
date: 2026-07-28
excerpt: Send the shell immediately and stream slow parts of the page as they resolve.
tags: [Streaming, Suspense, Performance]
---

With Server Components, a slow data source no longer blocks the whole page. Wrap the slow part in `Suspense` and React streams it in when it is ready.

## The pattern

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <>
      <Intro />
      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>
    </>
  );
}
```

`Intro` renders instantly. `PostList` is an async Server Component; while it awaits data, the skeleton is shown.

## loading.tsx is Suspense too

In the App Router, a `loading.tsx` file wraps the whole route segment in a Suspense boundary. It is convenient, but it also hides the static parts of the page. A boundary placed around just the slow component gives a better first paint.

## Static pages never show the fallback

If a route is prerendered at build time, the data is already there and the fallback never appears in production. Streaming matters most for dynamic routes.
