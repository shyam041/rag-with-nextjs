import { getLLM } from "@/lib/llm"
import { refineQueryPrompt } from "@/rag/prompts"
import type { RAGState } from "@/rag/state"

export async function refineDecomposeQueries(state: RAGState): Promise<Partial<RAGState>> {
  const llm = getLLM(0)

  const historyText = state.conversationContext
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")

  const chain = refineQueryPrompt.pipe(llm)
  const result = await chain.invoke({
    conversationHistory: historyText || "No prior conversation",
    query: state.query,
  })

  let queries: string[] = [state.query]
  try {
    const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content)
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
    if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
      queries = parsed.queries
    }
  } catch {
    queries = [state.query]
  }

  return {
    refinedQueries: queries,
    retrievalAttempts: state.retrievalAttempts + 1,
  }
}
