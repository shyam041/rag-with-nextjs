import { StateGraph, START, END } from "@langchain/langgraph"
import { RAGStateAnnotation } from "@/rag/state"
import { refineDecomposeQueries } from "@/rag/nodes/refine-query"
import { retrieve } from "@/rag/nodes/retrieve"
import { gradeDocuments, shouldRetry } from "@/rag/nodes/grade-documents"
import { generate } from "@/rag/nodes/generate"
import { prisma } from "@/lib/prisma"
import type { ChatResponse, Message } from "@/types"

const graph = new StateGraph(RAGStateAnnotation)
  .addNode("refineDecomposeQueries", refineDecomposeQueries)
  .addNode("retrieve", retrieve)
  .addNode("gradeDocuments", gradeDocuments)
  .addNode("generate", generate)
  .addEdge(START, "refineDecomposeQueries")
  .addEdge("refineDecomposeQueries", "retrieve")
  .addEdge("retrieve", "gradeDocuments")
  .addConditionalEdges("gradeDocuments", shouldRetry, {
    refine: "refineDecomposeQueries",
    generate: "generate",
  })
  .addEdge("generate", END)

const compiledGraph = graph.compile()

export async function processQuery(
  query: string,
  focusArea: string,
  conversationId: string
): Promise<ChatResponse> {
  let conversationContext: Message[] = []
  if (conversationId) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    })
    conversationContext = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role as "user" | "assistant",
      content: m.content,
      sources: m.sources ? JSON.parse(m.sources) : null,
      createdAt: m.createdAt.toISOString(),
    }))
  }

  const activeInstructions: string[] = []
  if (conversationId) {
    const links = await prisma.conversationInstruction.findMany({
      where: { conversationId },
      include: { instruction: true },
    })
    activeInstructions.push(...links.map((l) => l.instruction.content))
  }

  const result = await compiledGraph.invoke({
    query,
    focusArea,
    conversationId,
    conversationContext,
    activeInstructions,
    retrievalAttempts: 0,
  })

  return {
    conversationId,
    answer: result.llmResponse,
    sources: result.filteredSources.map((s: { documentId: string; documentName: string; pageNumber: number; content: string }) => ({
      documentId: s.documentId,
      documentName: s.documentName,
      pageNumber: s.pageNumber,
      content: s.content,
    })),
  }
}
