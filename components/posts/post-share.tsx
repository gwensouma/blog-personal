import { MailIcon } from "lucide-react";
import { CopyLinkButton } from "@/components/posts/copy-link-button";
import { Button } from "@/components/ui/button";

// Plain share URLs: no third-party scripts, no client JS except the copy button.
export function PostShare({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: "X", name: "Share on X", href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}` },
    {
      label: "LinkedIn",
      name: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-sm font-semibold">Share this post</h2>
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.name} (opens in a new tab)`} />}
            >
              {link.label}
            </Button>
          </li>
        ))}
        <li>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} aria-label="Share by email" />}
          >
            <MailIcon data-icon="inline-start" aria-hidden="true" />
            Email
          </Button>
        </li>
        <li>
          <CopyLinkButton url={url} />
        </li>
      </ul>
    </div>
  );
}
