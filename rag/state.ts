import { Annotation } from "@langchain/langgraph"
import type { Message, SourceDetail } from "@/types"

export const RAGStateAnnotation = Annotation.Root({
  query: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  focusArea: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  conversationId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  refinedQueries: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  documents: Annotation<SourceDetail[]>({ reducer: (_, b) => b, default: () => [] }),
  llmResponse: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  retrievalAttempts: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  citedDocumentIds: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  filteredSources: Annotation<SourceDetail[]>({ reducer: (_, b) => b, default: () => [] }),
  responseConfidence: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  conversationContext: Annotation<Message[]>({ reducer: (_, b) => b, default: () => [] }),
  activeInstructions: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
})

export type RAGState = typeof RAGStateAnnotation.State
