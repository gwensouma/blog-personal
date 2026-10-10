import { formatDate } from "@/lib/format";

export function PostDate({ date, className }: { date: string; className?: string }) {
  return (
    <time dateTime={date} className={className}>
      {formatDate(date)}
    </time>
  );
}
