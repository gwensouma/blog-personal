import "server-only";
import { access } from "node:fs/promises";
import path from "node:path";
import { getImageMeta } from "@/lib/data/images";
import { site } from "@/lib/site";
import type { AuthorAvatar } from "@/types/author";

/** The author's photo if `site.author.avatar` points at a file that exists under
 * public/, otherwise null (the UI then shows a monogram). A missing file is the
 * expected state until a photo is added, so it is not logged. */
export async function getAuthorAvatar(): Promise<AuthorAvatar | null> {
  const src = site.author.avatar;
  if (!src) return null;

  try {
    await access(path.join(process.cwd(), "public", src));
  } catch {
    return null;
  }

  try {
    return { src, ...(await getImageMeta(src)) };
  } catch (error) {
    console.error(`[authors] avatar "${src}" could not be read; showing the monogram instead.`, error);
    return null;
  }
}
