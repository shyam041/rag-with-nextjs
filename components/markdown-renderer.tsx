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
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="prose prose-sm max-w-none dark:prose-invert"
    >
      {clean}
    </ReactMarkdown>
  )
}
