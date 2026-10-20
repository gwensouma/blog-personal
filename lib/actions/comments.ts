"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clientKeyFrom } from "@/lib/client-address";
import { validateCommentInput } from "@/lib/comment-input";
import { addComment, type AddCommentResult } from "@/lib/data/comments";
import { getPost } from "@/lib/data/posts";
import type { CommentFormState } from "@/types/comment";

const POSTED: CommentFormState = { status: "success", message: "Thanks, your comment is posted." };
const GENERIC_ERROR: CommentFormState = {
  status: "error",
  message: "Something went wrong. Please reload the page and try again.",
};

// Server Action for the comment form, shaped for useActionState. The form posts here even
// before hydration (progressive enhancement). It is a public endpoint: everything the form
// enforces (required, maxLength) is checked again here, and it never throws for user input.
export async function addCommentAction(_previous: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const slug = formData.get("slug");
  const name = formData.get("name");
  const body = formData.get("body");
  // The honeypot may be missing from a hand-made POST; that counts as empty.
  const website = formData.get("website") ?? "";

  if (typeof slug !== "string" || slug === "" || typeof name !== "string" || typeof body !== "string" || typeof website !== "string") {
    return GENERIC_ERROR;
  }

  // A bot filled the hidden field: answer as if it worked, store nothing.
  if (website !== "") return POSTED;

  const input = validateCommentInput(name, body);
  if (!input.ok) {
    return { status: "error", message: input.message, field: input.field, name, body };
  }

  if (!(await getPost(slug))) return GENERIC_ERROR;

  const clientKey = clientKeyFrom((await headers()).get("x-forwarded-for"), process.env.TRUST_PROXY === "1");

  let status: AddCommentResult["status"];
  try {
    ({ status } = await addComment({ slug, name: input.name, body: input.body, clientKey }));
  } catch (error) {
    console.error("[comments] Could not store a comment.", error);
    return { status: "error", message: "Couldn't save your comment. Please try again.", name, body };
  }

  switch (status) {
    case "ok":
      revalidatePath(`/posts/${slug}`);
      return POSTED;
    case "duplicate":
      // Same answer as "ok": a reload or a double click must not look like a failure.
      return POSTED;
    case "full":
      return { status: "error", message: "This post has reached its comment limit.", name, body };
    case "rate-limited":
      return { status: "error", message: "Too many comments right now. Please try again in a few minutes.", name, body };
  }
}
