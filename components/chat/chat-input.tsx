"use client"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { InstructionPicker } from "./instruction-picker"

interface Props {
  onSend: (question: string) => void
  pending: boolean
  conversationId?: string
  focusArea: string
  onFocusAreaChange: (ns: string) => void
}

export function ChatInput({ onSend, pending, conversationId, focusArea, onFocusAreaChange }: Props) {
  const [text, setText] = useState("")

  const handleSend = () => {
    if (!text.trim() || pending) return
    onSend(text.trim())
    setText("")
  }

  return (
    <div className="border-t p-4 space-y-2">
      <div className="flex gap-2 items-center">
        <FocusAreaSelector value={focusArea} onChange={onFocusAreaChange} />
        {conversationId && (
          <InstructionPicker conversationId={conversationId} focusArea={focusArea} />
        )}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question..."
          className="resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button onClick={handleSend} disabled={pending || !text.trim()} size="icon" className="self-end h-10 w-10">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
