import "server-only";
import path from "node:path";
import sharp from "sharp";

// Server-only image helpers for files in public/. Remote images (http/https)
// are passed through untouched: they must declare their own width/height.
const PUBLIC_DIR = path.join(process.cwd(), "public");

export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//.test(src);
}

function resolvePublicFile(src: string): string {
  if (!src.startsWith("/") || src.startsWith("//")) {
    throw new Error(`Local image src must be a path under public/ starting with "/" (or an http(s) URL), got "${src}".`);
  }
  const file = path.normalize(path.join(PUBLIC_DIR, src));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new Error(`Image path escapes public/: ${src}`);
  return file;
}

export type ImageMeta = { width: number; height: number; blurDataURL: string };

// Memoised per src for the life of the server process: /posts and /search render
// on demand, and sharp shouldn't re-read every cover on each request. Failures
// are evicted so a fixed file is picked up on the next request.
const metaCache = new Map<string, Promise<ImageMeta>>();

/** Intrinsic size plus a tiny blurred PNG for next/image's `placeholder="blur"`. */
export function getImageMeta(src: string): Promise<ImageMeta> {
  let pending = metaCache.get(src);
  if (!pending) {
    pending = readImageMeta(src);
    pending.catch(() => metaCache.delete(src));
    metaCache.set(src, pending);
  }
  return pending;
}

async function readImageMeta(src: string): Promise<ImageMeta> {
  const file = resolvePublicFile(src);
  try {
    const image = sharp(file);
    const { width = 0, height = 0, autoOrient } = await image.metadata();
    const preview = await image.clone().rotate().resize(16, 16, { fit: "inside" }).blur().png().toBuffer();
    return {
      width: autoOrient?.width ?? width,
      height: autoOrient?.height ?? height,
      blurDataURL: `data:image/png;base64,${preview.toString("base64")}`,
    };
  } catch (error) {
    throw new Error(`Could not read cover image "${src}" (expected it under public/).`, { cause: error });
  }
}

/** A JPEG data URI of a local image (or the URL itself if remote), for next/og
 * which can't load site-relative paths at build time. */
export async function getImageDataUri(src: string, width: number): Promise<string> {
  if (isRemoteImage(src)) return src;
  const buffer = await sharp(resolvePublicFile(src)).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
