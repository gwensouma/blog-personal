import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ReadingColumn } from "@/components/reading-column";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <ReadingColumn className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">Page not found</h1>
      <p className="max-w-[46ch] text-lg text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try the archive or search instead.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Back to home
        </Button>
        <Button variant="ghost" size="lg" nativeButton={false} render={<Link href="/search" />}>
          Search posts
        </Button>
      </div>
    </ReadingColumn>
  );
}
