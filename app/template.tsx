import { PageTransition } from "@/components/motion/page-transition";

// Thin wrapper: PageTransition plays the enter animation on first load and
// restarts it on every pathname change (this root template itself only remounts
// when the route group changes).
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
