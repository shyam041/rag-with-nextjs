export type DocumentStatus = "UPLOADING" | "INDEXING" | "INDEXED" | "FAILED"

export interface FocusArea {
  id: string
  namespace: string
  name: string
  description: string | null
  chromaCollection: string
  createdAt: string
}

export interface Document {
  id: string
  name: string
  originalName: string
  focusAreaId: string
  status: DocumentStatus
  chunkCount: number
  fileSize: number
  mimeType: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  sources: Source[] | null
  createdAt: string
}

export interface Source {
  documentId: string
  documentName: string
  pageNumber: number
  content: string
}

export interface Conversation {
  id: string
  title: string | null
  focusAreaId: string
  createdAt: string
  updatedAt: string
}

export interface Instruction {
  id: string
  title: string
  content: string
  focusAreaId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ChatRequest {
  question: string
  focusArea: string
  conversationId?: string
}

export interface ChatResponse {
  conversationId: string
  answer: string
  sources: Source[]
}

export interface SourceDetail {
  documentId: string
  documentName: string
  pageNumber: number
  content: string
  score: number
}
