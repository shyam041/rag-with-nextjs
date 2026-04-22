import { Badge } from "@/components/ui/badge"
import type { DocumentStatus } from "@/types"

const statusConfig: Record<DocumentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  UPLOADING: { label: "Uploading", variant: "secondary" },
  INDEXING: { label: "Indexing", variant: "secondary" },
  INDEXED: { label: "Indexed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
}

export function DocumentStatus({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
