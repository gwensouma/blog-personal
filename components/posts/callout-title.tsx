import { Info, Lightbulb, MessageSquareWarning, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  note: Info,
  tip: Lightbulb,
  important: MessageSquareWarning,
  warning: TriangleAlert,
  caution: OctagonAlert,
};

type CalloutTitleProps = React.ComponentProps<"p"> & { "data-callout-title"?: string };

// Server Component for a Markdown callout's label row. lib/markdown.ts turns GitHub alerts
// (`> [!NOTE]`) into div[data-callout][role=note] whose first child is p[data-callout-title];
// post-body.tsx maps that paragraph here to add the kind's icon. The label text ("Note") comes
// from the tree, so the HTML string has it too. Styles live in post-body.tsx.
export function CalloutTitle({ children, ...props }: CalloutTitleProps) {
  const Icon = icons[props["data-callout-title"] ?? ""] ?? Info;
  return (
    <p {...props}>
      <Icon aria-hidden="true" />
      {children}
    </p>
  );
}
