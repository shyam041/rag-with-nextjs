import { Chroma } from "@langchain/community/vectorstores/chroma"
import { getEmbeddings } from "@/lib/embeddings"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"
import type { RAGState } from "@/rag/state"
import type { SourceDetail } from "@/types"

const SCORE_THRESHOLD = 0.5
const K = 5

export async function retrieve(state: RAGState): Promise<Partial<RAGState>> {
  const focusArea = await prisma.focusArea.findUniqueOrThrow({
    where: { namespace: state.focusArea },
  })

  const embeddings = getEmbeddings()
  const vectorStore = new Chroma(embeddings, {
    collectionName: focusArea.chromaCollection,
    url: env.CHROMA_URL,
  })

  const seen = new Set<string>()
  const allDocs: SourceDetail[] = []

  for (const query of state.refinedQueries) {
    try {
      const results = await vectorStore.similaritySearchWithScore(query, K)
      for (const [doc, score] of results) {
        if (score < SCORE_THRESHOLD) continue
        const key = `${doc.metadata.documentId}:${doc.metadata.pageNumber}:${doc.pageContent.slice(0, 50)}`
        if (seen.has(key)) continue
        seen.add(key)
        allDocs.push({
          documentId: doc.metadata.documentId,
          documentName: doc.metadata.documentName,
          pageNumber: doc.metadata.pageNumber ?? 0,
          content: doc.pageContent,
          score,
        })
      }
    } catch {
      // Collection may be empty — skip
    }
  }

  return { documents: allDocs }
}
