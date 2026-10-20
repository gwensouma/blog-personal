/** A reader's comment on a post. No IP or other personal data is stored. */
export type Comment = {
  /** From randomUUID(). */
  id: string;
  slug: string;
  name: string;
  /** Plain text; line breaks kept as "\n". Rendered as React text, never as HTML or Markdown. */
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Hidden by the owner (from /admin, later). Hidden comments are neither rendered nor counted. */
  hidden: boolean;
};

/** State returned by the comment Server Action, shaped for `useActionState`. */
export type CommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
  /** What the reader typed, echoed back on an error so the form keeps it. */
  name?: string;
  body?: string;
  /** The field the error is about; without it the error is about the form as a whole. */
  field?: "name" | "body";
};
