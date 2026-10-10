"use client";

import * as m from "motion/react-m";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

type DrawnCheckProps = {
  className?: string;
  /** Delay before the stroke starts drawing (s), e.g. to follow a container's entrance. */
  delay?: number;
  /** Forwarded so the icon can sit in a Button's icon slot. */
  "data-icon"?: "inline-start" | "inline-end";
};

// Lucide's check path, drawn on with pathLength so a confirmation reads as a tick
// being written. Same 24-unit viewBox and stroke as the other icons. Decorative:
// callers announce the confirmation in text (an aria-live region).
// Only mount it in response to a user action: its initial state (pathLength 0)
// is also what the server would render.
export function DrawnCheck({ className, delay = 0, ...props }: DrawnCheckProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
      {...props}
    >
      <m.path
        d="M20 6 9 17l-5-5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: ease.out, delay }}
      />
    </svg>
  );
}
