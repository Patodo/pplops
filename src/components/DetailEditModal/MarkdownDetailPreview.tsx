import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "@/components/Markdown/MermaidBlock";
import { DETAIL_MODAL_MARKDOWN_PREVIEW_MIN_HEIGHT } from "./constants";
import "github-markdown-css/github-markdown.css";
import "highlight.js/styles/github.css";

export function MarkdownDetailPreview({ markdown }: { markdown: string }) {
  return (
    <div
      className="markdown-body"
      data-color-mode="light"
      style={{ minHeight: DETAIL_MODAL_MARKDOWN_PREVIEW_MIN_HEIGHT }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code(props) {
            const { className, children } = props;
            const language = className?.replace("language-", "");
            const text = String(children).replace(/\n$/, "");
            if (language === "mermaid") {
              return <MermaidBlock chart={text} />;
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
