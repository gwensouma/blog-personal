import "server-only";
import { readStore, updateStore } from "@/lib/data/store";

// Newsletter sign-ups. Only stores the address for now; sending mail would
// plug in here (e.g. a provider API call) without touching the form or action.
const SUBSCRIBERS_KEY = "subscribers";
// The form is a public endpoint with no rate limit; a hard cap keeps a scripted
// flood from growing the store without bound. A real provider replaces this.
const MAX_SUBSCRIBERS = 5000;

type Subscriber = { email: string; subscribedAt: string };

/**
 * Adds an address if it's new. Returns false only when the list is full.
 * Deliberately doesn't say whether the address was already subscribed, so the
 * form can't be used to check who is on the list.
 */
export async function subscribe(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const existing = await readStore<Subscriber[]>(SUBSCRIBERS_KEY, []);
  if (existing.some((subscriber) => subscriber.email === normalized)) return true;
  if (existing.length >= MAX_SUBSCRIBERS) return false;

  let accepted = true;
  await updateStore<Subscriber[]>(SUBSCRIBERS_KEY, [], (list) => {
    // Re-check inside the serialized update in case of a concurrent sign-up.
    if (list.some((subscriber) => subscriber.email === normalized)) return list;
    if (list.length >= MAX_SUBSCRIBERS) {
      accepted = false;
      return list;
    }
    return [...list, { email: normalized, subscribedAt: new Date().toISOString() }];
  });
  return accepted;
}
