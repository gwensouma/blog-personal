import { CodeCopyButton } from "@/components/posts/code-copy-button";

type CodeBlockProps = React.ComponentProps<"div"> & { "data-language"?: string };

// Server Component for a fenced code block (lib/markdown.ts wraps each one in
// div[data-code-block]; post-body.tsx maps that wrapper here). A toolbar row with the
// language label and the copy button sits above the Shiki <pre>, which stays server
// HTML. Only CodeCopyButton is client code. The frame is styled from post-body.tsx.
export function CodeBlock({ children, "data-language": language, ...props }: CodeBlockProps) {
  return (
    <div {...props} data-language={language}>
      <div data-code-toolbar="">
        {language ? <span data-code-lang="">{language}</span> : null}
        <CodeCopyButton language={language} />
      </div>
      {children}
    </div>
  );
}
