"use client"
import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"
import type { Message } from "@/types"

export function MessageList({ messages, pending }: { messages: Message[]; pending: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pending])

  return (
    <ScrollArea className="flex-1 p-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {pending && (
        <div className="flex justify-start mb-4">
          <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground animate-pulse">
            Thinking...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </ScrollArea>
  )
}
