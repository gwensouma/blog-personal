import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { JsonLd } from "@/components/json-ld";
import { ReadingColumn } from "@/components/reading-column";
import { NewsletterSection } from "@/components/newsletter/newsletter-section";
import { FeaturedPost, FeaturedPostSkeleton } from "@/components/posts/featured-post";
import { LatestPosts, LatestPostsSkeleton } from "@/components/posts/latest-posts";
import { PopularPosts } from "@/components/posts/popular-posts";
import { TopicsSection } from "@/components/tags/topics-section";
import { personJsonLd, websiteJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// ISR: view counts (PopularPosts) change at runtime, so regenerate the static page in the background every 5 minutes.
export const revalidate = 300;

// Server Component. The intro renders immediately; each data-driven section
// is an async component behind its own <Suspense>, so they stream in independently.
export default function Home() {
  return (
    <ReadingColumn className="flex flex-col gap-16">
      <JsonLd data={[websiteJsonLd(), personJsonLd()]} />

      <HomeHero />

      <Suspense fallback={<FeaturedPostSkeleton />}>
        <FeaturedPost />
      </Suspense>

      <Suspense fallback={<LatestPostsSkeleton />}>
        <LatestPosts />
      </Suspense>

      {/* null fallback: the list renders nothing when no post has views yet, so a skeleton could flash for nothing. */}
      <Suspense fallback={null}>
        <PopularPosts />
      </Suspense>

      <Suspense fallback={null}>
        <TopicsSection />
      </Suspense>

      <NewsletterSection />
    </ReadingColumn>
  );
}
