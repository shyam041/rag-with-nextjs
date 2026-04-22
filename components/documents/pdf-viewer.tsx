"use client"
import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  return (
    <div className="flex flex-col items-center gap-2">
      <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNumber} width={600} />
      </Document>
      <div className="flex items-center gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>Prev</Button>
        <span>Page {pageNumber} of {numPages}</span>
        <Button variant="outline" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>Next</Button>
      </div>
    </div>
  )
}
