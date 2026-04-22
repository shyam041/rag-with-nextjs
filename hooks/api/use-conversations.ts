import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Conversation, Message } from "@/types"

export function useConversations(focusArea?: string) {
  return useQuery<Conversation[]>({
    queryKey: ["conversations", focusArea],
    queryFn: () =>
      fetch(`/api/conversations${focusArea ? `?focusArea=${focusArea}` : ""}`).then((r) => r.json()),
  })
}

export function useConversation(id: string | undefined) {
  return useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["conversation", id],
    queryFn: () => fetch(`/api/conversations/${id}`).then((r) => r.json()),
    enabled: !!id,
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/conversations/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  })
}

export function useConversationInstructions(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["conversation-instructions", conversationId],
    queryFn: () => fetch(`/api/conversations/${conversationId}/instructions`).then((r) => r.json()),
    enabled: !!conversationId,
  })
}

export function useAddConversationInstruction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (instructionId: string) =>
      fetch(`/api/conversations/${conversationId}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructionId }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-instructions", conversationId] }),
  })
}

export function useRemoveConversationInstruction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (instructionId: string) =>
      fetch(`/api/conversations/${conversationId}/instructions/${instructionId}`, {
        method: "DELETE",
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-instructions", conversationId] }),
  })
}
