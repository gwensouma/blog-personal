import { cn } from "@/lib/utils";

// The shared ~720px editorial column that every page body sits in.
export function ReadingColumn({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-180", className)} {...props} />;
}
