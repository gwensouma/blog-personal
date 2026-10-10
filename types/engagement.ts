export type PostStats = {
  likes: number;
  views: number;
  /** Whether the current visitor has liked the post (from their cookie). */
  liked: boolean;
};

/** State returned by the newsletter Server Action, shaped for `useActionState`. */
export type NewsletterState =
  | { status: "idle" }
  | { status: "success"; message: string }
  /** `field: "email"` marks the address itself as invalid; without it the error is about the form as a whole. */
  | { status: "error"; message: string; email?: string; field?: "email" };
