"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
};

// Client leaf: the only part of the nav that needs the current URL.
export function NavLink({ href, children, className, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isCurrentPage = pathname === href;
  // Section match: "/posts" stays highlighted on "/posts/some-slug".
  const isInSection = !isCurrentPage && href !== "/" && pathname.startsWith(`${href}/`);
  const isActive = isCurrentPage || isInSection;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isCurrentPage ? "page" : isInSection ? "true" : undefined}
      className={cn(
        // The underline is a 2px primary bar that sweeps in from the left on hover
        // (transform only) and stays drawn for the active section.
        "relative rounded-sm text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
        "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out-expo hover:after:scale-x-100 motion-reduce:after:transition-none",
        isActive && "text-foreground after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
