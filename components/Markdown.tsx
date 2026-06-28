"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function CodeBlock({ children, className }: { children?: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";

  const copy = () => {
    const text = extractText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group relative my-3">
      <div className="flex items-center justify-between rounded-t-xl border border-border border-b-0 bg-surface-2 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-faint">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className={cn("!mt-0 !rounded-t-none", className)}>{children}</pre>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose-aegis", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: (props) => <CodeBlock {...props} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
