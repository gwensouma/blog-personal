"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import type { Variants } from "motion/react";
import { useReveal } from "@/components/motion/use-reveal";
import { reveal, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Print shows the final state even if a block was never revealed.

// "hidden" is applied instantly: it only ever happens off screen, at hydration.
const variants: Variants = {
  hidden: { opacity: 0, y: reveal.offset, transition: { duration: 0 } },
  shown: { opacity: 1, y: 0, transition: spring.reveal },
};

type RevealProps = {
  children: React.ReactNode;
  as?: "div" | "section";
  className?: string;
  "aria-labelledby"?: string;
};

// Client wrapper that fades and lifts a block in when it scrolls into view.
// Its children are Server Components, rendered on the server and passed through.
export function Reveal({ children, as = "div", className, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useReveal(ref);
  const Component = as === "section" ? m.section : m.div;

  return (
    <Component ref={ref} initial={false} animate={state} variants={variants} className={cn("print:opacity-100! print:transform-none!", className)} {...props}>
      {children}
    </Component>
  );
}
