import { cn } from "@/lib/utils";

type TextRevealProps = {
  text: string;
  /** Delay before the first word, in ms. */
  delay?: number;
  /** Delay between words, in ms. */
  step?: number;
  className?: string;
};

// Word-by-word masked reveal for display headings. A Server Component on
// purpose: it is pure CSS (tw-animate-css keyframes + the ease-spring token), so
// the heading animates on first paint without waiting for hydration, and is fully
// readable with JS disabled. Each word rises out of an overflow-hidden mask.
export function TextReveal({ text, delay = 80, step = 70, className }: TextRevealProps) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span className={className}>
      {/* Screen readers get the sentence once, not word fragments. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={index}>
            {/* pb/-mb gives descenders room inside the mask without changing the line box. */}
            <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <span
                className={cn(
                  "inline-block origin-bottom-left",
                  "motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:slide-in-from-bottom-full motion-safe:spin-in-6 motion-safe:duration-900 motion-safe:ease-spring",
                )}
                style={{ animationDelay: `${delay + index * step}ms` }}
              >
                {word}
              </span>
            </span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </span>
  );
}
