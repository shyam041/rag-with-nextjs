"use client"
import { FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Source } from "@/types"

export function SourcesPanel({ sources }: { sources: Source[] }) {
  if (!sources.length) return null
  return (
    <div className="border-l w-72 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">Sources ({sources.length})</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {sources.map((s, i) => (
            <div key={i} className="rounded border p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="font-medium truncate">{s.documentName}</span>
                <Badge variant="outline" className="ml-auto shrink-0">p.{s.pageNumber}</Badge>
              </div>
              <p className="text-muted-foreground line-clamp-3">{s.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
