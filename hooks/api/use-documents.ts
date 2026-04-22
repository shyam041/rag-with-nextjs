import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Document } from "@/types"

export function useDocuments(focusArea?: string, search?: string, page = 1) {
  const params = new URLSearchParams()
  if (focusArea) params.set("focusArea", focusArea)
  if (search) params.set("search", search)
  params.set("page", String(page))

  return useQuery<{ documents: Document[]; total: number }>({
    queryKey: ["documents", focusArea, search, page],
    queryFn: () => fetch(`/api/documents?${params}`).then((r) => r.json()),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, focusAreaId }: { file: File; focusAreaId: string }) => {
      const form = new FormData()
      form.append("file", file)
      form.append("focusAreaId", focusAreaId)
      return fetch("/api/documents", { method: "POST", body: form }).then((r) => r.json())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}

export function useIndexDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      fetch("/api/documents/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}
