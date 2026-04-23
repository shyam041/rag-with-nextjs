import { NextRequest, NextResponse } from "next/server"
import { indexDocument } from "@/rag/indexer"

export async function POST(req: NextRequest) {
  const { documentId } = await req.json()
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 })

  try {
    await indexDocument(documentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[/api/documents/index] indexDocument failed:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
