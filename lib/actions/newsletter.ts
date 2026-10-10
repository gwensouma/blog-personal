"use server";

import { subscribe } from "@/lib/data/newsletter";
import type { NewsletterState } from "@/types/engagement";

// Loose on purpose: the browser's type="email" check runs first, and real
// verification would be a confirmation email, not a stricter regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server Action for the newsletter form, shaped for useActionState. The form
// posts here even before hydration (progressive enhancement).
export async function subscribeAction(_previous: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address.", email, field: "email" };
  }

  // One message for new and existing addresses, so the form doesn't reveal who is subscribed.
  return (await subscribe(email))
    ? { status: "success", message: "Thanks for subscribing. New posts will land in your inbox." }
    : { status: "error", message: "Sign-ups are paused right now. Please try again later.", email };
}
