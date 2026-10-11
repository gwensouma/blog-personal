import { splitMatches } from "@/lib/highlight";
import { cn } from "@/lib/utils";

/** Classes for a search match: a soft primary wash that keeps the surrounding text color. */
export const highlightMarkClassName =
  "rounded-sm bg-primary/15 px-0.5 text-current [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

// Renders `text` with every case-insensitive occurrence of `query` wrapped in <mark>.
// Plain React text nodes only (no dangerouslySetInnerHTML), so the query is always escaped.
export function HighlightedText({ text, query, className }: { text: string; query?: string; className?: string }) {
  if (!query) return <>{text}</>;
  return (
    <>
      {splitMatches(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={cn(highlightMarkClassName, className)}>
            {segment.text}
          </mark>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
