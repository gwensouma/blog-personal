"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CopyIcon, TriangleAlertIcon } from "lucide-react";
import { DrawnCheck } from "@/components/motion/drawn-check";
import { Button } from "@/components/ui/button";

type Status = "idle" | "copied" | "error";

// false on the server and during hydration, true afterwards: the button only exists
// once JS can make it work, and server and client markup match at hydration.
const subscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

const messages: Record<Status, string> = {
  idle: "",
  copied: "Code copied to clipboard",
  error: "Couldn't copy the code. Select it and copy it manually.",
};

// Client leaf rendered by the CodeBlock Server Component (only after hydration), so React owns it like any
// other element (it survives server re-renders, e.g. after liking the post). It reads
// the code from its own block's <pre> at click time instead of receiving it as a prop,
// so the code isn't sent twice. Feedback lasts 2s: a drawn check + "Copied", or a
// warning + "Copy failed". Each button has its own polite live region; it's cleared and
// refilled on the next frame so copying the same block twice is announced twice.
export function CodeCopyButton({ language }: { language?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [announcement, setAnnouncement] = useState("");
  const ref = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const hydrated = useHydrated();

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function announce(next: Status) {
    setStatus(next);
    setAnnouncement("");
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setAnnouncement(messages[next]));
  }

  async function copy() {
    const code = ref.current?.closest("[data-code-block]")?.querySelector("pre");
    try {
      await navigator.clipboard.writeText(code?.textContent ?? "");
      announce("copied");
    } catch {
      announce("error");
    }
  }

  // No JS, no clipboard: the toolbar then shows only the language label.
  if (!hydrated) return null;

  return (
    <>
      <Button ref={ref} variant="ghost" size="xs" onClick={copy} className="-mr-2 ml-auto">
        {status === "copied" ? (
          <DrawnCheck data-icon="inline-start" />
        ) : status === "error" ? (
          <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" className="text-destructive" />
        ) : (
          <CopyIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy"}
        {/* Names each button apart from the others on the page ("Copy tsx code"). */}
        <span className="sr-only">{language ? ` ${language} code` : " code"}</span>
      </Button>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
