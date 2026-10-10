"use client";

import { startTransition, useOptimistic, useState } from "react";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLikeAction } from "@/lib/actions/engagement";
import { ease, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PostStats } from "@/types/engagement";

const PARTICLES = 8;
// Precomputed burst directions (unit circle, offset by half a step so it doesn't read as a plus sign).
const directions = Array.from({ length: PARTICLES }, (_, index) => {
  const angle = ((index + 0.5) / PARTICLES) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

type LikeButtonProps = {
  slug: string;
  /** Read on the server (PostLike) from the store and the visitor's cookie. */
  initialStats: PostStats;
};

// Client leaf: the only part of the post footer that needs state and an onClick handler.
// The count and "liked" flag come from the server; a click updates the UI at once with
// useOptimistic, then calls the setLikeAction Server Action. When the action settles the
// optimistic value is replaced by the server's answer, or, if it threw, falls back to the
// last confirmed stats (rollback) and an error is announced.
// Motion: liking pops the heart on a spring and fires a one-shot particle burst, and the
// count rolls to its new value. Reduced motion: no burst, no scale or roll (MotionConfig
// drops transforms).
export function LikeButton({ slug, initialStats }: LikeButtonProps) {
  const [stats, setStats] = useState(initialStats);
  const [optimistic, setOptimistic] = useOptimistic(stats);
  const [failed, setFailed] = useState(false);
  // Bumped on every like so each one replays the pop and gets a fresh burst.
  const [burst, setBurst] = useState(0);
  // Direction the count rolls: +1 when it goes up, -1 when it goes down, 0 before any click.
  const [roll, setRoll] = useState(0);
  const reduceMotion = useReducedMotion();

  function toggle() {
    const liked = !optimistic.liked;
    const next: PostStats = { ...optimistic, liked, likes: Math.max(0, optimistic.likes + (liked ? 1 : -1)) };
    setFailed(false);
    setRoll(liked ? 1 : -1);
    if (liked) setBurst((value) => value + 1);

    startTransition(async () => {
      setOptimistic(next);
      try {
        const confirmed = await setLikeAction(slug, liked);
        // Updates after an await need their own transition to stay part of this action.
        startTransition(() => setStats(confirmed));
      } catch {
        // No setStats: once the transition ends, the optimistic value reverts to `stats`.
        setFailed(true);
      }
    });
  }

  const { liked, likes } = optimistic;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button variant="outline" size="pill" aria-pressed={liked} onClick={toggle}>
        <span data-icon="inline-start" className="relative inline-flex">
          <m.span
            key={burst}
            className="inline-flex"
            initial={burst > 0 ? { scale: 0.4 } : false}
            animate={{ scale: 1 }}
            transition={spring.pop}
          >
            <HeartIcon
              aria-hidden="true"
              className={cn("size-4 text-primary transition-colors duration-200 motion-reduce:transition-none", liked && "fill-primary")}
            />
          </m.span>
          {burst > 0 && liked && !reduceMotion ? (
            <span key={burst} aria-hidden="true" className="pointer-events-none absolute inset-0">
              {directions.map((direction, index) => (
                <m.span
                  key={index}
                  className={cn(
                    "absolute top-1/2 left-1/2 -mt-0.75 -ml-0.75 size-1.5 rounded-full",
                    index % 2 === 0 ? "bg-primary" : "bg-primary/50",
                  )}
                  initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
                  animate={{
                    x: [0, direction.x * 21, direction.x * 26],
                    y: [0, direction.y * 21, direction.y * 26],
                    scale: [0.6, 1.2, 0.3],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 0.7, ease: ease.out, times: [0, 0.45, 1] }}
                />
              ))}
            </span>
          ) : null}
        </span>
        {/* Label stays constant; the pressed state is conveyed by aria-pressed and the filled heart. */}
        <span>Like</span>
        <span aria-hidden="true" className="inline-flex overflow-hidden text-muted-foreground tabular-nums">
          <m.span
            key={likes}
            className="inline-block"
            initial={roll === 0 ? false : { y: roll > 0 ? "70%" : "-70%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={spring.snappy}
          >
            {likes}
          </m.span>
        </span>
        <span className="sr-only">
          , {likes} {likes === 1 ? "like" : "likes"}
        </span>
      </Button>
      <p role="status" className="text-sm text-destructive">
        {failed ? "Couldn't save your like. Try again." : ""}
      </p>
    </div>
  );
}
