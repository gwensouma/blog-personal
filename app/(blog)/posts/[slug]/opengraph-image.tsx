import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OgCard, ogCoverSize, ogSize, type OgCover } from "@/components/og-card";
import { pickCoverVariant } from "@/lib/cover-variant";
import { getImageDataUri } from "@/lib/data/images";
import { getOgFonts } from "@/lib/data/og-fonts";
import { getPost, getPosts } from "@/lib/data/posts";
import { formatDate, formatReadingTime } from "@/lib/format";
import { site } from "@/lib/site";

export const alt = `A post from ${site.name}`;
export const size = ogSize;
export const contentType = "image/png";
export const dynamicParams = false;

// Prerender one image per post at build time.
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  // Real cover if set, otherwise the default cover with the same look as the
  // standalone cover on the post page (issue-based pick, light-theme colors).
  const cover: OgCover = post.cover
    ? { kind: "image", src: await getImageDataUri(post.cover.src, ogCoverSize.width * 2) }
    : { kind: "default", variant: pickCoverVariant(post), issue: post.issue, tag: post.tags[0] };

  return new ImageResponse(
    <OgCard
      siteName={site.name}
      title={post.title}
      description={post.excerpt}
      cover={cover}
      meta={`${site.author.name} · ${formatDate(post.date)} · ${formatReadingTime(post.readingTime)}`}
    />,
    { ...size, fonts: await getOgFonts() },
  );
}
