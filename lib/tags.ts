import { slug } from "github-slugger";

/** URL slug for a tag name, e.g. "App Router" -> "app-router". Pure: safe on server and client. */
export function tagSlug(name: string): string {
  return slug(name);
}
