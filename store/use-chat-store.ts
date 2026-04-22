import { create } from "zustand"
import type { Message } from "@/types"

interface ConversationState {
  messages: Message[]
  pending: boolean
}

interface ChatStore {
  conversations: Record<string, ConversationState>
  addMessage: (conversationId: string, message: Message) => void
  setPending: (conversationId: string, pending: boolean) => void
  setMessages: (conversationId: string, messages: Message[]) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: {},
  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          messages: [...(state.conversations[conversationId]?.messages ?? []), message],
          pending: state.conversations[conversationId]?.pending ?? false,
        },
      },
    })),
  setPending: (conversationId, pending) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          messages: state.conversations[conversationId]?.messages ?? [],
          pending,
        },
      },
    })),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: { messages, pending: false },
      },
    })),
}))
