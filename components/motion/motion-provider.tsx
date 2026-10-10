"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("@/components/motion/motion-features").then((module) => module.domAnimation);

// Client provider mounted once in app/layout.tsx. Server Component children pass
// through untouched: a client wrapper can render server-rendered `children`
// without turning them into client code.
// - LazyMotion + `m` keeps the bundle small: the domAnimation feature set is
//   fetched after hydration (async import), and `strict` throws if a full
//   `motion.*` component sneaks in. Nothing visible depends on it at first paint:
//   first-paint entrances are CSS, and `m` elements render their static state.
// - reducedMotion="user" drops transform animations for prefers-reduced-motion
//   users (opacity still fades), so every primitive respects it by default.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
