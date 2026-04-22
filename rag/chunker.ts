import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"

export function createChunker() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
  })
}

export interface PageContent {
  text: string
  pageNumber: number
}

export async function chunkPages(
  pages: PageContent[],
  metadata: { documentId: string; documentName: string; focusArea: string }
): Promise<Document[]> {
  const chunker = createChunker()
  const allChunks: Document[] = []

  for (const page of pages) {
    if (!page.text.trim()) continue
    const chunks = await chunker.createDocuments(
      [page.text],
      [{ ...metadata, pageNumber: page.pageNumber }]
    )
    allChunks.push(...chunks)
  }

  return allChunks
}
