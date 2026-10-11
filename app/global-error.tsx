"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

// Replaces the root layout when it fails, so it renders its own <html> and <body>.
// Kept dependency-light: the regular header, footer and fonts may be what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-180 flex-col items-start justify-center gap-4 px-6">
          <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">The journal didn&apos;t load</h1>
          <p className="max-w-[46ch] text-lg text-muted-foreground">
            Something went wrong on our side while building this page. Try again, or come back in a moment.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => reset()}>
              Try again
            </Button>
            {/* A full page load, not client navigation: the app shell itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full reload */}
            <Button variant="link" size="lg" nativeButton={false} render={<a href="/" />}>
              Go to the home page
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
