import Image from "next/image";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { AuthorAvatar as AuthorAvatarData } from "@/types/author";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// The author's avatar: a Fraunces monogram on the brand field (the same family as
// the default post covers), with the photo laid over it via next/image once
// `site.author.avatar` points at an existing file. Decorative: the author's name
// is always printed next to it.
// Server Component on purpose: the shadcn Avatar is a Base UI client component and
// would add ~18 kB of JS to /about for a static circle. The monogram underneath
// doubles as the fallback (it shows while the photo's blur placeholder resolves).
export function AuthorAvatar({ avatar, className }: { avatar: AuthorAvatarData | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-160 from-brand to-brand-deep font-heading text-2xl font-semibold tracking-wide text-brand-foreground select-none sm:size-24 sm:text-3xl",
        className,
      )}
    >
      {initials(site.author.name)}
      {avatar ? (
        <Image
          src={avatar.src}
          alt=""
          fill
          sizes="96px"
          placeholder="blur"
          blurDataURL={avatar.blurDataURL}
          className="object-cover"
        />
      ) : null}
    </span>
  );
}
