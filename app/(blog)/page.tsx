import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { JsonLd } from "@/components/json-ld";
import { ReadingColumn } from "@/components/reading-column";
import { NewsletterSection } from "@/components/newsletter/newsletter-section";
import { FeaturedPost } from "@/components/posts/featured-post";
import { LatestPosts } from "@/components/posts/latest-posts";
import { PopularPosts } from "@/components/posts/popular-posts";
import { TopicsSection } from "@/components/tags/topics-section";
import { personJsonLd, websiteJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// ISR: view counts (PopularPosts) change at runtime, so regenerate the static page in the background every 5 minutes.
export const revalidate = 300;

// Server Component. Every data section is an async Server Component awaited on the server, with no <Suspense>
// on purpose: on this prerendered (ISR) page a boundary can't stream, and its content would sit in a hidden
// template revealed by an inline script, invisible without JS. PopularPosts renders nothing until a post has views.
export default function Home() {
  return (
    <ReadingColumn className="flex flex-col gap-16">
      <JsonLd data={[websiteJsonLd(), personJsonLd()]} />

      <HomeHero />

      <FeaturedPost />

      <LatestPosts />

      <PopularPosts />

      <TopicsSection />

      <NewsletterSection />
    </ReadingColumn>
  );
}
