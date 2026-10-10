"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type { PostIndexItem } from "@/types/post";

// The dialog (Base UI Dialog + cmdk) is a separate chunk, fetched on first open (or
// when the pointer/focus reaches the trigger), so it costs nothing on first load.
const loadPalette = () => import("@/components/layout/command-palette");
const CommandPalette = dynamic(() => loadPalette().then((module) => module.CommandPalette), { ssr: false });

// "⌘" on Apple platforms, "Ctrl" elsewhere. The server snapshot is "Ctrl", so
// hydration matches and Apple users see "⌘" right after.
const subscribe = () => () => {};
const isApple = () => /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

type CommandMenuProps = {
  /** Post index, streamed from the server as a promise (resolved in the palette with use()). */
  index: Promise<PostIndexItem[]>;
};

// Client leaf: the header's search control. It's a real link to /search, so without
// JS (or with a modifier-click) it simply goes to the search page. With JS, a plain
// click or Ctrl/⌘+K opens the command palette instead.
export function CommandMenu({ index }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  // Mount the palette once it's been asked for, then keep it (it animates closed).
  const [requested, setRequested] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  // Where focus goes when the palette closes: whatever had it before it opened,
  // or the trigger if nothing did (e.g. the shortcut pressed with focus on <body>).
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const apple = useSyncExternalStore(subscribe, isApple, () => false);

  function show() {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : triggerRef.current;
    setRequested(true);
    setOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (open) setOpen(false);
      else show();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        nativeButton={false}
        aria-label="Search posts"
        aria-keyshortcuts="Control+K Meta+K"
        aria-haspopup="dialog"
        render={<Link href="/search" ref={triggerRef} />}
        onPointerEnter={() => void loadPalette()}
        onFocus={() => void loadPalette()}
        onClick={(event) => {
          // Let new-tab / new-window clicks through to the /search link.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          show();
        }}
        className="size-8 px-0 lg:w-auto lg:gap-2 lg:px-2.5 lg:text-muted-foreground lg:hover:text-foreground"
      >
        <SearchIcon aria-hidden="true" />
        <span aria-hidden="true" className="hidden lg:inline">
          Search
        </span>
        <KbdGroup aria-hidden="true" className="hidden lg:inline-flex">
          <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      {requested ? <CommandPalette open={open} onOpenChange={setOpen} index={index} returnFocusRef={returnFocusRef} /> : null}
    </>
  );
}
