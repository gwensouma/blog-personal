"use client";

import { useLayoutEffect, useRef } from "react";
import * as m from "motion/react-m";
import { useScroll, useSpring } from "motion/react";
import { spring } from "@/lib/motion";

// Client leaf: a thin bar fixed to the top of the viewport that fills as the
// element with `targetId` (a server-rendered article) is read. It takes an id
// rather than children, so the article itself stays a Server Component.
// Decorative (aria-hidden): the scrollbar already conveys position.
export function ScrollProgress({ targetId }: { targetId: string }) {
  const target = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    target.current = document.getElementById(targetId);
  }, [targetId]);

  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  const scaleX = useSpring(scrollYProgress, spring.progress);

  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-primary"
    />
  );
}
