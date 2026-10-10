"use client";

import { useEffect, useState } from "react";
import { LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawnCheck } from "@/components/motion/drawn-check";

type Status = "idle" | "copied" | "error";

// Client leaf: the only share control that needs a browser API (clipboard).
export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy}>
        {status === "copied" ? (
          <DrawnCheck data-icon="inline-start" />
        ) : (
          <LinkIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {status === "copied" ? "Link copied" : "Copy link"}
      </Button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Link copied to clipboard" : status === "error" ? "Couldn't copy the link. Copy it from the address bar." : ""}
      </span>
    </>
  );
}
