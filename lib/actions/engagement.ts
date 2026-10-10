"use server";

import { setLike } from "@/lib/data/engagement";
import { getPost } from "@/lib/data/posts";
import type { PostStats } from "@/types/engagement";

// Server Action: the like button calls this directly from the client. Every
// export of a "use server" file is a public endpoint, so validate the input.
export async function setLikeAction(slug: string, liked: boolean): Promise<PostStats> {
  if (typeof slug !== "string" || typeof liked !== "boolean" || !(await getPost(slug))) {
    throw new Error("Unknown post.");
  }
  return setLike(slug, liked);
}
