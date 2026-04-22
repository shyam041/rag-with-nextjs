import { z } from "zod"
import { getLLM } from "@/lib/llm"
import { generateResponsePrompt } from "@/rag/prompts"
import type { RAGState } from "@/rag/state"

const responseSchema = z.object({
  answer: z.string(),
  citedDocumentIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export async function generate(state: RAGState): Promise<Partial<RAGState>> {
  const llm = getLLM(0)

  const formattedDocs = state.documents
    .map((doc, i) => `**Document DOC_${i + 1} (${doc.documentName}, p.${doc.pageNumber}):**\n${doc.content}`)
    .join("\n\n---\n\n")

  const instructionsText =
    state.activeInstructions.length > 0
      ? `Additional instructions:\n${state.activeInstructions.join("\n")}`
      : ""

  const chain = generateResponsePrompt.pipe(llm)
  const result = await chain.invoke({
    documents: formattedDocs || "No relevant documents found.",
    query: state.query,
    instructions: instructionsText,
  })

  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content)

  let answer = "I could not find relevant information to answer your question."
  let citedDocumentIds: string[] = []
  let confidence = 0

  try {
    const parsed = responseSchema.parse(JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}"))
    answer = parsed.answer
    citedDocumentIds = parsed.citedDocumentIds
    confidence = parsed.confidence
  } catch {
    answer = content
  }

  // Map DOC_N references to actual document IDs
  const docIdMap = state.documents.reduce<Record<string, string>>((acc, doc, i) => {
    acc[`DOC_${i + 1}`] = doc.documentId
    return acc
  }, {})

  const resolvedIds = citedDocumentIds.map((ref) => docIdMap[ref] ?? ref).filter(Boolean)
  const filteredSources = state.documents.filter((d) => resolvedIds.includes(d.documentId))

  return { llmResponse: answer, citedDocumentIds: resolvedIds, filteredSources, responseConfidence: confidence }
}
