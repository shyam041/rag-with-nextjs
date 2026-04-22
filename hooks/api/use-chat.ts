import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ChatRequest, ChatResponse } from "@/types"

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: (body) =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Chat request failed")
        return r.json()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  })
}
