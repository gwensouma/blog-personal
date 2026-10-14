import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import { BackToTop } from "@/components/layout/back-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { site } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import "@/app/globals.css";

// Fonts are self-hosted by next/font and exposed as CSS variables for Tailwind.
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-heading" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.author.url }],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: site.name,
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
  },
  alternates: {
    types: { "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} RSS feed` }] },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: themeInitScript adds the .dark class before React hydrates.
    <html lang="en" suppressHydrationWarning className={cn("font-sans", fraunces.variable, sourceSans.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col leading-relaxed antialiased">
        <a
          href="#main"
          className="sr-only rounded-sm bg-background px-3 py-2 text-sm font-medium text-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:ring-3 focus:ring-ring/50 focus:outline-none"
        >
          Skip to content
        </a>
        {/* Client provider (LazyMotion + reduced-motion config); everything inside stays server-rendered. */}
        <MotionProvider>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="w-full flex-1 px-6 pt-12 pb-24 outline-none sm:pt-16">
            {children}
          </main>
          <SiteFooter />
          <BackToTop />
        </MotionProvider>
      </body>
    </html>
  );
}
