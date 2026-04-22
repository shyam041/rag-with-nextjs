import { AppShell } from "@/components/layout/app-shell"
import { DocumentTable } from "@/components/documents/document-table"
import { UploadDialog } from "@/components/documents/upload-dialog"

export default function DocumentsPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Documents</h2>
          <UploadDialog />
        </div>
        <DocumentTable />
      </div>
    </AppShell>
  )
}
