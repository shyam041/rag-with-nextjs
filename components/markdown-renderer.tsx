"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import DOMPurify from "dompurify"
import "highlight.js/styles/github.css"

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  const clean = typeof window !== "undefined" ? DOMPurify.sanitize(content) : content
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {clean}
      </ReactMarkdown>
    </div>
  )
}
