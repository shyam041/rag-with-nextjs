"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { toast } from "sonner"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useCreateInstruction, useUpdateInstruction } from "@/hooks/api/use-instructions"
import type { Instruction } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
  instruction?: Instruction
}

export function InstructionDialog({ open, onClose, instruction }: Props) {
  const [title, setTitle] = useState("")
  const [focusAreaNs, setFocusAreaNs] = useState("")
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)

  const create = useCreateInstruction()
  const update = useUpdateInstruction()

  const editor = useEditor({
    extensions: [StarterKit],
    content: instruction?.content ?? "",
    immediatelyRender: false,
  })

  useEffect(() => {
    if (instruction) {
      setTitle(instruction.title)
      const fa = focusAreas.find((f) => f.id === instruction.focusAreaId)
      if (fa) setFocusAreaNs(fa.namespace)
      editor?.commands.setContent(instruction.content)
    } else {
      setTitle("")
      editor?.commands.setContent("")
    }
  }, [instruction, open, editor, focusAreas])

  const handleSave = async () => {
    const content = editor?.getHTML() ?? ""
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return }

    try {
      if (instruction) {
        await update.mutateAsync({ id: instruction.id, title, content })
        toast.success("Instruction updated")
      } else {
        const fa = focusAreas.find((f) => f.namespace === focusAreaNs)
        if (!fa) { toast.error("Select a focus area"); return }
        await create.mutateAsync({ title, content, focusAreaId: fa.id })
        toast.success("Instruction created")
      }
      onClose()
    } catch {
      toast.error("Failed to save instruction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{instruction ? "Edit Instruction" : "New Instruction"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          {!instruction && (
            <FocusAreaSelector value={focusAreaNs} onChange={setFocusAreaNs} placeholder="Select focus area" />
          )}
          <div className="border rounded-md p-3 min-h-40 prose prose-sm max-w-none">
            <EditorContent editor={editor} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
