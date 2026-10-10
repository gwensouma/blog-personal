import { absoluteUrl, site } from "@/lib/site";
import type { PostSummary } from "@/types/post";

// Schema.org JSON-LD builders. Pure functions: pages pass the result to <JsonLd />.

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.author.name,
    jobTitle: site.author.role,
    description: site.author.bio,
    url: absoluteUrl(site.author.url),
    sameAs: site.social.map((link) => link.href),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    description: site.description,
    url: absoluteUrl("/"),
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function blogPostingJsonLd(post: PostSummary) {
  const url = absoluteUrl(`/posts/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    keywords: post.tags.join(", "),
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: site.author.name, url: absoluteUrl(site.author.url) },
    publisher: { "@type": "Person", name: site.author.name },
  };
}
