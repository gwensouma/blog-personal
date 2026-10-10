import type { Metadata } from "next";
import { AuthorAbout } from "@/components/authors/author-about";
import { JsonLd } from "@/components/json-ld";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { getAuthorAvatar } from "@/lib/data/authors";
import { site } from "@/lib/site";
import { personJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About",
  description: `Who writes ${site.name} and what it covers.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const avatar = await getAuthorAvatar();

  return (
    <ReadingColumn>
      <JsonLd data={personJsonLd()} />
      <PageHeader title="About" description={`${site.name} is a learning journal about React Server Components.`} />
      <AuthorAbout avatar={avatar} />
    </ReadingColumn>
  );
}
