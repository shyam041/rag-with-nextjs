"use client"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import type { Message } from "@/types"

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {message.sources.length} source{message.sources.length !== 1 ? "s" : ""} cited
          </p>
        )}
      </div>
    </div>
  )
}
