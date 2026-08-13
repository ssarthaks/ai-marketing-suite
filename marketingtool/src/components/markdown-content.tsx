import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export interface MarkdownContentProps {
  content: string;
  className?: string;
  density?: "compact" | "comfortable";
  preserveSoftBreaks?: boolean;
}

function isExternalUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const components: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1
      className="mb-3 mt-6 text-xl font-bold leading-tight text-foreground first:mt-0"
      {...props}
    />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2
      className="mb-2 mt-5 text-lg font-semibold leading-tight text-foreground first:mt-0"
      {...props}
    />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3
      className="mb-2 mt-4 text-base font-semibold leading-snug text-foreground first:mt-0"
      {...props}
    />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4
      className="mb-1.5 mt-3 font-semibold leading-snug text-foreground first:mt-0"
      {...props}
    />
  ),
  p: ({ node: _node, ...props }) => (
    <p
      className="my-2 leading-relaxed text-foreground/90 first:mt-0 last:mb-0"
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  del: ({ node: _node, ...props }) => (
    <del className="text-muted-foreground" {...props} />
  ),
  a: ({ node: _node, href = "", ...props }) => {
    const external = isExternalUrl(href);
    return (
      <a
        className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
        href={href}
        rel={external ? "noopener noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      />
    );
  },
  ul: ({ node: _node, ...props }) => (
    <ul
      className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground"
      {...props}
    />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol
      className="my-2 list-decimal space-y-1 pl-5 marker:font-medium marker:text-muted-foreground"
      {...props}
    />
  ),
  li: ({ node: _node, ...props }) => (
    <li className="leading-relaxed text-foreground/90" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-3 border-l-4 border-primary/50 bg-muted/40 py-2 pl-4 pr-3 italic text-foreground/80"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr className="my-5 border-border" {...props} />
  ),
  table: ({ node: _node, children, ...props }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
      <table
        className="w-full min-w-[32rem] border-collapse text-left text-xs"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ node: _node, ...props }) => (
    <thead
      className="border-b border-border bg-muted/80 font-semibold text-foreground"
      {...props}
    />
  ),
  tbody: ({ node: _node, ...props }) => (
    <tbody className="divide-y divide-border/60" {...props} />
  ),
  tr: ({ node: _node, ...props }) => (
    <tr className="align-top hover:bg-muted/30" {...props} />
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border-r border-border px-3 py-2.5 font-semibold last:border-r-0"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td
      className="border-r border-border px-3 py-2.5 leading-relaxed text-foreground/90 last:border-r-0"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-3 max-w-full overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs leading-relaxed"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  input: ({ node: _node, ...props }) => (
    <input
      className="mr-2 size-3.5 align-middle accent-primary"
      {...props}
      disabled
    />
  ),
  img: ({ node: _node, src: _src, alt }) => (
    <span className="italic text-muted-foreground">
      {alt ? `[Image omitted: ${alt}]` : "[Image omitted]"}
    </span>
  ),
};

/**
 * Renders untrusted AI/user Markdown with one consistent visual and security
 * policy. Raw HTML and remote images are intentionally disabled.
 */
export function MarkdownContent({
  content,
  className,
  density = "comfortable",
  preserveSoftBreaks = true,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "markdown-content min-w-0 max-w-full overflow-x-hidden",
        density === "compact" ? "text-xs" : "text-sm",
        preserveSoftBreaks && "[&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap",
        className,
      )}
      data-markdown-preview="true"
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={defaultUrlTransform}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
