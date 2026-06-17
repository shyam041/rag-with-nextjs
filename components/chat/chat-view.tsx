"use client"
import { useEffect } from "react"
import { toast } from "sonner"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { SourcesPanel } from "./sources-panel"
import { useSendMessage } from "@/hooks/api/use-chat"
import { useChatStore } from "@/store/use-chat-store"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useConversation } from "@/hooks/api/use-conversations"
import type { Message, Source } from "@/types"

interface Props {
  conversationId?: string
}

export function ChatView({ conversationId }: Props) {
  const sendMessage = useSendMessage()
  const { conversations, addMessage, setPending, setMessages } = useChatStore()
  const { selectedNamespace, setSelectedNamespace } = useFocusAreaStore()

  const focusArea = selectedNamespace ?? ""
  const state = conversations[conversationId ?? "new"] ?? { messages: [], pending: false }

  const { data: existing } = useConversation(conversationId)

  useEffect(() => {
    if (existing?.messages && conversationId) {
      setMessages(conversationId, existing.messages)
    } else if (!conversationId) {
      setMessages("new", [])
    }
  }, [existing, conversationId, setMessages])

  const lastAssistantSources: Source[] =
    [...state.messages].reverse().find((m) => m.role === "assistant")?.sources ?? []

  const handleSend = async (question: string) => {
    if (!focusArea) {
      toast.error("Please select a focus area first")
      return
    }

    const tempUserMsg: Message = {
      id: `tmp-${Date.now()}`,
      conversationId: conversationId ?? "new",
      role: "user",
      content: question,
      sources: null,
      createdAt: new Date().toISOString(),
    }

    const convoKey = conversationId ?? "new"
    addMessage(convoKey, tempUserMsg)
    setPending(convoKey, true)

    try {
      const result = await sendMessage.mutateAsync({ question, focusArea, conversationId })

      const assistantMsg: Message = {
        id: `tmp-assistant-${Date.now()}`,
        conversationId: result.conversationId,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        createdAt: new Date().toISOString(),
      }

      if (!conversationId) {
        setMessages(result.conversationId, [tempUserMsg, assistantMsg])
        window.history.replaceState(null, "", `/chat/${result.conversationId}`)
      } else {
        addMessage(convoKey, assistantMsg)
      }
    } catch {
      toast.error("Failed to get a response")
    } finally {
      setPending(convoKey, false)
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">
        <MessageList messages={state.messages} pending={state.pending} />
        <ChatInput
          onSend={handleSend}
          pending={state.pending}
          conversationId={conversationId}
          focusArea={focusArea}
          onFocusAreaChange={setSelectedNamespace}
        />
      </div>
      <SourcesPanel sources={lastAssistantSources} />
    </div>
  )
}
