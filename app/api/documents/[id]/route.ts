import { NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { prisma } from "@/lib/prisma"
import { deleteDocumentVectors } from "@/rag/indexer"

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { focusArea: true },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await deleteDocumentVectors(doc.id, doc.focusArea.chromaCollection)

  try {
    await unlink(doc.blobPath)
  } catch {
    // File may already be missing — safe to ignore
  }

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
