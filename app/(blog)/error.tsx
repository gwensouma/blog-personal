"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ReadingColumn } from "@/components/reading-column";
import { Button } from "@/components/ui/button";

// Error boundaries must be Client Components: they receive a reset() callback to retry rendering.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ReadingColumn className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">This page didn&apos;t load</h1>
      <p className="max-w-[46ch] text-lg text-muted-foreground">
        Something went wrong while loading it. Try again, or head back to the home page.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/" />}>
          Back to home
        </Button>
      </div>
    </ReadingColumn>
  );
}
