import fs from "fs"
import path from "path"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")
import { Chroma } from "@langchain/community/vectorstores/chroma"
import { prisma } from "@/lib/prisma"
import { getEmbeddings } from "@/lib/embeddings"
import { getOrCreateCollection } from "@/lib/chroma"
import { chunkPages } from "@/rag/chunker"
import { env } from "@/lib/env"

export async function indexDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { focusArea: true },
  })

  if (doc.mimeType !== "application/pdf") {
    throw new Error("Only PDF documents are supported")
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "INDEXING" },
  })

  try {
    const filePath = path.resolve(doc.blobPath)
    const buffer = fs.readFileSync(filePath)
    const parsed = await pdfParse(buffer)

    // pdf-parse gives full text; split by form-feed character for pages
    const rawPages = parsed.text.split("\f")
    const pages = rawPages.map((text: string, i: number) => ({ text, pageNumber: i + 1 }))

    const chunks = await chunkPages(pages, {
      documentId: doc.id,
      documentName: doc.originalName,
      focusArea: doc.focusArea.namespace,
    })

    const embeddings = getEmbeddings()

    await Chroma.fromDocuments(chunks, embeddings, {
      collectionName: doc.focusArea.chromaCollection,
      url: env.CHROMA_URL,
    })

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "INDEXED", chunkCount: chunks.length },
    })
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    })
    throw error
  }
}

export async function deleteDocumentVectors(documentId: string, collectionName: string): Promise<void> {
  try {
    const collection = await getOrCreateCollection(collectionName)
    await collection.delete({ where: { documentId } })
  } catch {
    // Collection may not exist yet — safe to ignore
  }
}
