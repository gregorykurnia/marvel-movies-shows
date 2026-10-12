import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

// Recaps are pasted as plain text and shown as Markdown (PRODUCT_PLAN §2.1, IMPLEMENTATION_PLAN §5.5).
// remark-breaks keeps single line breaks from pasted text, remark-gfm adds lists and tables, and
// rehype-sanitize removes any raw HTML. The prose styles follow design-preview.html section 05: 68ch,
// 17px, red list markers, and a yellow highlighter behind bold text.
export function RecapMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[17px] leading-[1.75] text-ink",
        "[&_p]:mt-3.5 [&_p:first-child]:mt-0",
        "[&_h1]:mt-7 [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:leading-[1.15] [&_h1]:font-bold",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:leading-[1.15] [&_h2]:font-bold",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[22px] [&_h3]:leading-[1.2] [&_h3]:font-bold",
        "[&_h4]:mt-5 [&_h4]:mb-1.5 [&_h4]:font-display [&_h4]:text-lg [&_h4]:font-bold",
        "[&_strong]:bg-[linear-gradient(transparent_60%,var(--yellow-soft)_60%)] [&_strong]:font-bold",
        "[&_ul]:my-3 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:pl-5 [&_li]:mt-1",
        "[&_ul>li::marker]:text-red [&_ol>li::marker]:font-mono [&_ol>li::marker]:text-red",
        "[&_a]:font-bold [&_a]:text-red-ink [&_a]:underline [&_a]:underline-offset-[3px]",
        "[&_code]:rounded-md [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.88em]",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-yellow [&_blockquote]:pl-4 [&_blockquote]:text-ink-2",
        "[&_hr]:my-6 [&_hr]:border-line-soft",
        "[&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
        "[&_th]:border-b-2 [&_th]:border-line [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-bold",
        "[&_td]:border-b-[1.5px] [&_td]:border-line-soft [&_td]:px-2.5 [&_td]:py-1.5",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSanitize]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
