"use client"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useUploadDocument, useIndexDocument } from "@/hooks/api/use-documents"
import { useFocusAreas } from "@/hooks/api/use-focus-areas"

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [focusAreaNs, setFocusAreaNs] = useState<string>("")
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)
  useFocusAreas()

  const upload = useUploadDocument()
  const index = useIndexDocument()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
  })

  const handleUpload = async () => {
    const fa = focusAreas.find((f) => f.namespace === focusAreaNs)
    if (!fa) { toast.error("Select a focus area"); return }
    if (!files.length) { toast.error("Select at least one file"); return }

    for (const file of files) {
      try {
        const doc = await upload.mutateAsync({ file, focusAreaId: fa.id })
        toast.info(`Uploading ${file.name}...`)
        await index.mutateAsync(doc.id)
        toast.success(`${file.name} indexed successfully`)
      } catch {
        toast.error(`Failed to process ${file.name}`)
      }
    }
    setFiles([])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Upload className="w-4 h-4 mr-2" /> Upload PDF</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload PDF Documents</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FocusAreaSelector value={focusAreaNs} onChange={setFocusAreaNs} placeholder="Select focus area" />
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop PDF files here" : "Drag & drop PDFs, or click to select"}
            </p>
          </div>
          {files.length > 0 && (
            <ul className="text-sm space-y-1">
              {files.map((f, i) => <li key={i} className="truncate text-muted-foreground">• {f.name}</li>)}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={upload.isPending || index.isPending}>
              Upload & Index
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
