import { ImageResponse } from "next/og";
import { OgCard, ogSize } from "@/components/og-card";
import { getOgFonts } from "@/lib/data/og-fonts";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.description}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      siteName={site.name}
      title="Notes on React Server Components"
      description={site.description}
      meta={`By ${site.author.name}`}
    />,
    { ...size, fonts: await getOgFonts() },
  );
}
