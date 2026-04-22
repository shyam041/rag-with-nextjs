"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { DocumentStatus } from "./document-status"
import { useDocuments, useDeleteDocument } from "@/hooks/api/use-documents"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import type { Document } from "@/types"

export function DocumentTable() {
  const [focusArea, setFocusArea] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDocuments(focusArea || undefined, search || undefined, page)
  const deleteDoc = useDeleteDocument()

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.originalName}"?`)) return
    try {
      await deleteDoc.mutateAsync(doc.id)
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <FocusAreaSelector value={focusArea} onChange={setFocusArea} placeholder="All focus areas" />
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Focus Area</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Size</th>
                <th className="text-left p-3">Chunks</th>
                <th className="text-left p-3">Date</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.documents ?? []).map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-3 max-w-xs truncate">{doc.originalName}</td>
                  <td className="p-3">{(doc as any).focusArea?.name ?? ""}</td>
                  <td className="p-3"><DocumentStatus status={doc.status as any} /></td>
                  <td className="p-3">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                  <td className="p-3">{doc.chunkCount}</td>
                  <td className="p-3">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data?.documents ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No documents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{data?.total ?? 0} documents</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={!data || page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
