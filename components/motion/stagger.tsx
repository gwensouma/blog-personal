"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import type { Variants } from "motion/react";
import { useReveal } from "@/components/motion/use-reveal";
import { reveal, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Print shows the final state even if a block was never revealed.

const listVariants: Variants = {
  hidden: { transition: { duration: 0 } },
  shown: { transition: { staggerChildren: reveal.stagger, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: reveal.offset, transition: { duration: 0 } },
  shown: { opacity: 1, y: 0, transition: spring.reveal },
};

type StaggerListProps = {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

// Client wrapper for a list whose rows reveal one after another on scroll.
// The <li> rows (StaggerItem) wrap server-rendered content passed as children.
export function StaggerList({ children, className, ...props }: StaggerListProps) {
  const ref = useRef<HTMLUListElement>(null);
  const state = useReveal(ref);

  return (
    <m.ul ref={ref} initial={false} animate={state} variants={listVariants} className={className} {...props}>
      {children}
    </m.ul>
  );
}

// One row of a StaggerList: inherits "hidden"/"shown" from the list. Outside a
// StaggerList it renders as a plain, static <li>. Children stay Server Components.
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.li variants={itemVariants} className={cn("print:opacity-100! print:transform-none!", className)}>
      {children}
    </m.li>
  );
}
