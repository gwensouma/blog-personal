"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useMotionValueEvent, useScroll } from "motion/react";
import { spring } from "@/lib/motion";

/** A heading counts as "current" once its top passes this fraction of the viewport. */
const ACTIVE_LINE = 0.3;

type Marker = { y: number; height: number };

// Client leaf: scroll-spy for the server-rendered table of contents passed as
// children. It only marks the current link (aria-current="location", styled by
// PostToc) and slides a primary marker next to it; the list itself stays server HTML.
export function TocSpy({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const { scrollY } = useScroll();

  const update = useCallback(() => {
    const line = window.innerHeight * ACTIVE_LINE;
    let current: string | null = null;
    for (const id of ids) {
      const heading = document.getElementById(id);
      if (heading && heading.getBoundingClientRect().top <= line) current = id;
    }
    setActiveId((previous) => (previous === current ? previous : current));
  }, [ids]);

  useEffect(update, [update]);
  // motion batches scroll reads into one frame-synced callback (passive listener).
  useMotionValueEvent(scrollY, "change", update);

  useEffect(() => {
    const links = container.current?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [];
    let next: Marker | null = null;
    for (const link of links) {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      if (isActive) {
        link.setAttribute("aria-current", "location");
        next = { y: link.offsetTop, height: link.offsetHeight };
      } else {
        link.removeAttribute("aria-current");
      }
    }
    setMarker(next);
  }, [activeId]);

  return (
    <div ref={container} className="relative">
      {children}
      {/* A 1px bar scaled to the link height: transform-only, so it never triggers layout. */}
      <m.span
        aria-hidden="true"
        initial={false}
        animate={marker ? { opacity: 1, y: marker.y, scaleY: marker.height } : { opacity: 0 }}
        transition={spring.snappy}
        className="absolute top-0 left-0 h-px w-0.5 origin-top rounded-full bg-primary"
      />
    </div>
  );
}
