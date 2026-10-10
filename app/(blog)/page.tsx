import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { JsonLd } from "@/components/json-ld";
import { ReadingColumn } from "@/components/reading-column";
import { NewsletterSection } from "@/components/newsletter/newsletter-section";
import { FeaturedPost, FeaturedPostSkeleton } from "@/components/posts/featured-post";
import { LatestPosts, LatestPostsSkeleton } from "@/components/posts/latest-posts";
import { TopicsSection } from "@/components/tags/topics-section";
import { personJsonLd, websiteJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

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

      <Suspense fallback={null}>
        <TopicsSection />
      </Suspense>

      <NewsletterSection />
    </ReadingColumn>
  );
}
