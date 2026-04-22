"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { InstructionDialog } from "./instruction-dialog"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useInstructions, useDeleteInstruction } from "@/hooks/api/use-instructions"
import type { Instruction } from "@/types"

export function InstructionList() {
  const [focusArea, setFocusArea] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Instruction | undefined>()

  const { data: instructions = [], isLoading } = useInstructions(focusArea || undefined)
  const deleteInstruction = useDeleteInstruction()

  const handleDelete = async (inst: Instruction) => {
    if (!confirm(`Delete "${inst.title}"?`)) return
    try {
      await deleteInstruction.mutateAsync(inst.id)
      toast.success("Instruction deleted")
    } catch {
      toast.error("Failed to delete instruction")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FocusAreaSelector value={focusArea} onChange={setFocusArea} placeholder="All focus areas" />
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> New Instruction
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Focus Area</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Updated</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(instructions as Instruction[]).map((inst) => (
                <tr key={inst.id} className="border-t">
                  <td className="p-3">{inst.title}</td>
                  <td className="p-3">{(inst as any).focusArea?.name ?? ""}</td>
                  <td className="p-3">
                    <Badge variant={inst.isActive ? "default" : "secondary"}>
                      {inst.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">{new Date(inst.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(inst); setDialogOpen(true) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inst)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(instructions as Instruction[]).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No instructions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <InstructionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        instruction={editing}
      />
    </div>
  )
}
