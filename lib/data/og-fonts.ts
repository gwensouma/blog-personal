import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { OG_FONT_FAMILY } from "@/lib/og";

// Static TTF instances for Satori (next/og), which can't use woff2 or variable fonts.
// The files are committed in assets/fonts/ (SIL OFL 1.1, see the OFL-*.txt files there)
// and read from disk, so building the OG images needs no network.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: "normal" };

const files = [
  { name: OG_FONT_FAMILY.heading, file: "Fraunces-72pt-Regular.ttf", weight: 400 },
  { name: OG_FONT_FAMILY.heading, file: "Fraunces-72pt-SemiBold.ttf", weight: 600 },
  { name: OG_FONT_FAMILY.sans, file: "SourceSans3-Regular.ttf", weight: 400 },
] as const;

let fonts: Promise<OgFont[]> | undefined;

/** The `fonts` option for ImageResponse. Read once per process. */
export function getOgFonts(): Promise<OgFont[]> {
  fonts ??= Promise.all(
    files.map(async ({ name, file, weight }) => ({
      name,
      data: await readFile(path.join(FONT_DIR, file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}
