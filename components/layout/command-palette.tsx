"use client";

import { Suspense, use, useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, HashIcon, LayoutListIcon, SearchIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { site } from "@/lib/site";
import { tagSlug } from "@/lib/tags";
import type { PostIndexItem } from "@/types/post";

// Every word typed must appear in the item's value or keywords. cmdk's default fuzzy
// scorer matches scattered letters ("suspense" hit unrelated titles), which reads as noise.
function filterItems(value: string, search: string, keywords: string[] = []) {
  const haystack = [value, ...keywords].join(" ").toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
    ? 1
    : 0;
}

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: Promise<PostIndexItem[]>;
  returnFocusRef: React.RefObject<HTMLElement | null>;
};

// Loaded on demand by CommandMenu (next/dynamic), so Base UI Dialog and cmdk stay out
// of every route's first-load JS. cmdk filters as you type (posts match on title and
// tags), arrow keys move, Enter navigates. Escape closes and focus goes back to where
// it was (Base UI's finalFocus). "See all results" hands the query to /search.
export function CommandPalette({ open, onOpenChange, index, returnFocusRef }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        finalFocus={returnFocusRef}
        className="top-[max(1rem,12dvh)] translate-y-0 gap-0 overflow-hidden p-0 duration-200 ease-out-expo data-open:slide-in-from-top-4 data-open:zoom-in-[0.97] sm:max-w-xl motion-reduce:data-open:slide-in-from-top-0 motion-reduce:data-open:zoom-in-100"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search the journal</DialogTitle>
          <DialogDescription>Find a post by title or tag, or jump to a tag or page.</DialogDescription>
        </DialogHeader>
        <Command loop filter={filterItems} className="rounded-none! p-0">
          <div className="border-b border-border p-2">
            <CommandInput value={query} onValueChange={setQuery} placeholder="Search posts, tags and pages" />
          </div>
          <CommandList className="max-h-[min(24rem,60dvh)] p-1">
            <CommandEmpty className="text-muted-foreground">No posts, tags or pages match.</CommandEmpty>
            <Suspense fallback={<p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading posts…</p>}>
              <IndexGroups index={index} go={go} />
            </Suspense>
            <CommandGroup heading="Pages">
              {site.nav.map((item) => (
                <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                  <LayoutListIcon aria-hidden="true" className="text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {trimmed ? (
              <>
                <CommandSeparator />
                <CommandGroup forceMount>
                  <CommandItem forceMount value="see-all-results" onSelect={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}>
                    <SearchIcon aria-hidden="true" className="text-muted-foreground" />
                    <span className="truncate">See all results for &ldquo;{trimmed}&rdquo;</span>
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Reads the streamed index with use(). It resolved long before anyone opens the
// palette, so the Suspense fallback above is a just-in-case.
function IndexGroups({ index, go }: { index: Promise<PostIndexItem[]>; go: (href: string) => void }) {
  const posts = use(index);
  const tags = [...new Set(posts.flatMap((post) => post.tags))].sort((a, b) => a.localeCompare(b));

  return (
    <>
      <CommandGroup heading="Posts">
        {posts.map((post) => (
          <CommandItem
            key={post.slug}
            value={post.title}
            keywords={post.tags}
            onSelect={() => go(`/posts/${post.slug}`)}
            className="items-start"
          >
            <FileTextIcon aria-hidden="true" className="mt-0.5 text-muted-foreground" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground">{post.title}</span>
              {post.tags.length > 0 ? <span className="truncate text-xs text-muted-foreground">{post.tags.join(", ")}</span> : null}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="Tags">
        {tags.map((tag) => (
          <CommandItem key={tag} value={`#${tag}`} onSelect={() => go(`/tags/${tagSlug(tag)}`)}>
            <HashIcon aria-hidden="true" className="text-muted-foreground" />
            {tag}
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
