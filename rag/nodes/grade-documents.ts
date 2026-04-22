import { getLLM } from "@/lib/llm"
import { gradeDocumentPrompt } from "@/rag/prompts"
import type { RAGState } from "@/rag/state"

export async function gradeDocuments(state: RAGState): Promise<Partial<RAGState>> {
  const llm = getLLM(0)
  const chain = gradeDocumentPrompt.pipe(llm)
  const query = state.refinedQueries[0] ?? state.query

  const gradingResults = await Promise.all(
    state.documents.map(async (doc) => {
      try {
        const result = await chain.invoke({ query, content: doc.content })
        const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content)
        const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
        return { doc, relevant: parsed.relevant === true }
      } catch {
        return { doc, relevant: true } // default to relevant on error
      }
    })
  )

  const relevant = gradingResults.filter((r) => r.relevant).map((r) => r.doc)
  return { documents: relevant }
}

export function shouldRetry(state: RAGState): "refine" | "generate" {
  const relevantCount = state.documents.length
  if (relevantCount === 0 && state.retrievalAttempts < 2) return "refine"
  return "generate"
}
