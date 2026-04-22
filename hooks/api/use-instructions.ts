import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Instruction } from "@/types"

export function useInstructions(focusArea?: string) {
  return useQuery<Instruction[]>({
    queryKey: ["instructions", focusArea],
    queryFn: () =>
      fetch(`/api/instructions${focusArea ? `?focusArea=${focusArea}` : ""}`).then((r) => r.json()),
  })
}

export function useCreateInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; content: string; focusAreaId: string }) =>
      fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}

export function useUpdateInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string; isActive?: boolean }) =>
      fetch(`/api/instructions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}

export function useDeleteInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/instructions/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}
