---
title: Server Actions for mutations
date: 2026-06-14
excerpt: Forms that post straight to a server function, with progressive enhancement for free.
tags: [Server Actions, Forms]
---

Reading data is half the story. Server Actions cover the other half: functions that run on the server and can be called from a form or a Client Component.

## A minimal action

```ts
"use server";

export async function subscribe(formData: FormData) {
  const email = String(formData.get("email"));
  await saveSubscriber(email);
}
```

Pass it to a form's `action` prop and the form works even before JavaScript loads.

## Pending state

Inside a Client Component, `useFormStatus` reports whether the parent form is submitting. Keep that component small: a submit button is usually enough.

## Revalidating

After a mutation, call `revalidatePath` or `revalidateTag` so cached Server Components re-render with fresh data.
