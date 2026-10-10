import type { Metadata } from "next";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { TagIndex } from "@/components/tags/tag-index";
import { getAllTags } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse every post in the journal by topic.",
  alternates: { canonical: "/tags" },
};

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <ReadingColumn>
      <PageHeader title="Tags" description="Every topic the journal has covered so far, most written-about first." />
      <TagIndex tags={tags} />
    </ReadingColumn>
  );
}
