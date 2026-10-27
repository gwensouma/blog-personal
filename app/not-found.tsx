import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ReadingColumn } from "@/components/reading-column";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <ReadingColumn className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">Page not found</h1>
      <p className="max-w-[46ch] text-lg text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try the archive or search instead.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Back to home
        </Link>
        <Link href="/search" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Search posts
        </Link>
      </div>
    </ReadingColumn>
  );
}
