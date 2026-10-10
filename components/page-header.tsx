import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

// The h1 + dek block that opens every index-style page (archive, tags, search, about).
export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-10", className)}>
      <h1 className="font-heading text-4xl leading-tight font-semibold text-balance [overflow-wrap:anywhere] sm:text-5xl">
        {title}
      </h1>
      {description ? <div className="max-w-[52ch] text-lg text-muted-foreground">{description}</div> : null}
      {children}
    </header>
  );
}
