---
title: Server Actions for mutations
date: 2026-06-14
excerpt: Forms that post straight to a server function, with progressive enhancement for free.
tags: [Server Actions, Forms]
cover:
  src: /images/posts/server-actions-for-mutations.webp
  alt: A paper plane gliding along a thin line toward a solid block anchored at its far end
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

Pass it to a form's `action` prop and the form works even before JavaScript loads.[^progressive]

> [!NOTE]
> Every exported function in a `"use server"` file becomes a public HTTP endpoint. Anyone can call it with any payload, not just your form, so treat its arguments like the body of an API request.

> [!WARNING]
> `FormData` values are untrusted input (strings, files or null). Validate and normalize them (trim, check length, parse the email) before they reach your data layer, and check that the user is allowed to make the change.

## Pending state

Inside a Client Component, `useFormStatus` reports whether the parent form is submitting. Keep that component small: a submit button is usually enough.

> [!TIP]
> `useFormStatus` only reads the status of a *parent* `<form>`. Calling it in the same component that renders the form always returns `pending: false`, so move the button into its own component.

## Revalidating

After a mutation, call `revalidatePath` or `revalidateTag` so cached Server Components re-render with fresh data.[^revalidate]

[^progressive]: Without JavaScript the browser submits the form as a regular POST and the server responds with the re-rendered page. Once the client has hydrated, React intercepts the submit and calls the action without a full reload.

[^revalidate]: When the action calls `revalidatePath` or `revalidateTag`, Next.js sends the updated RSC payload back in the same response as the action result, so the page updates in one round trip.
