"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import { useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

type ParallaxProps = {
  children: React.ReactNode;
  /** Travel in % of the layer's height, each way. The layer overhangs its frame by more than this. */
  distance?: number;
  className?: string;
};

// Client wrapper for a scroll parallax inside a clipped frame (e.g. a cover).
// It fills its `relative overflow-hidden` parent; the inner layer is 16% taller
// than the frame and drifts against the scroll, so its edges never show.
// Children stay Server Components. The static outer div is the scroll target, so
// the moving layer never measures itself. Reduced motion: the layer stays still.
export function Parallax({ children, distance = 5, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, (progress) => (reduce ? "0%" : `${(progress - 0.5) * 2 * distance}%`));

  return (
    <div ref={ref} className="absolute inset-0">
      <m.div style={{ y }} className={cn("absolute inset-x-0 -inset-y-[8%] print:transform-none!", className)}>
        {children}
      </m.div>
    </div>
  );
}
