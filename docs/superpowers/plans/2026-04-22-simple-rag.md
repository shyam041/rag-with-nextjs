# simple-rag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single Next.js 15 RAG application with LangGraph orchestration, ChromaDB vector storage, and OpenAI, supporting PDF document indexing and conversational retrieval scoped to focus areas.

**Architecture:** Next.js 15 App Router serves both frontend and API routes. The RAG pipeline runs server-side via LangGraph (refine → retrieve → grade → generate). ChromaDB holds vector embeddings (one collection per focus area); SQLite/Prisma holds metadata, conversations, and instructions.

**Tech Stack:** Next.js 15, LangChain.js, LangGraph.js, ChromaDB, SQLite + Prisma, OpenAI, shadcn/ui, TanStack Query, Zustand, pdf-parse, TipTap, react-pdf

---

## File Map

```
(working directory = C:\Users\shyamd\Desktop\rag-with-nextjs — scaffold here with .)

prisma/schema.prisma          — All 6 Prisma models
prisma/seed.ts                — Seeds 3 focus areas
uploads/                      — PDF storage (gitignored)

app/layout.tsx                — Root layout: QueryClientProvider + Toaster
app/page.tsx                  — Redirect → /chat
app/chat/page.tsx             — New conversation
app/chat/[conversationId]/page.tsx  — Existing conversation
app/documents/page.tsx        — Document management
app/instructions/page.tsx     — Instruction management

app/api/focus-areas/route.ts                              — GET
app/api/documents/route.ts                                — GET, POST
app/api/documents/[id]/route.ts                           — DELETE
app/api/documents/index/route.ts                          — POST (trigger indexing)
app/api/chat/route.ts                                     — POST
app/api/conversations/route.ts                            — GET
app/api/conversations/[id]/route.ts                       — GET, DELETE
app/api/conversations/[id]/instructions/route.ts          — GET, POST
app/api/conversations/[id]/instructions/[instructionId]/route.ts — DELETE
app/api/instructions/route.ts                             — GET, POST
app/api/instructions/[id]/route.ts                        — PUT, DELETE

lib/env.ts                    — Zod-validated env vars
lib/prisma.ts                 — Singleton PrismaClient
lib/chroma.ts                 — ChromaClient + getOrCreateCollection()
lib/llm.ts                    — ChatOpenAI factory
lib/embeddings.ts             — OpenAIEmbeddings factory

rag/state.ts                  — RAGState type + LangGraph Annotation
rag/prompts.ts                — All ChatPromptTemplates
rag/chunker.ts                — RecursiveCharacterTextSplitter
rag/indexer.ts                — Full PDF → chunk → embed → store pipeline
rag/nodes/refine-query.ts     — Query refinement node
rag/nodes/retrieve.ts         — ChromaDB similarity search node
rag/nodes/grade-documents.ts  — LLM relevance grading node
rag/nodes/generate.ts         — Citation-aware response generation node
rag/graph.ts                  — Assembled StateGraph + processQuery()

types/index.ts                — Shared TypeScript types

store/use-focus-area-store.ts — Selected focus area (Zustand)
store/use-chat-store.ts       — Messages + pending per conversation (Zustand)

hooks/api/use-focus-areas.ts      — GET /api/focus-areas
hooks/api/use-conversations.ts    — Conversations CRUD
hooks/api/use-chat.ts             — POST /api/chat
hooks/api/use-documents.ts        — Documents CRUD + upload
hooks/api/use-instructions.ts     — Instructions CRUD

components/ui/                    — shadcn/ui generated
components/layout/app-shell.tsx
components/layout/sidebar.tsx
components/layout/header.tsx
components/chat/chat-view.tsx
components/chat/chat-input.tsx
components/chat/message-list.tsx
components/chat/message-bubble.tsx
components/chat/sources-panel.tsx
components/chat/conversation-list.tsx
components/chat/instruction-picker.tsx
components/documents/document-table.tsx
components/documents/upload-dialog.tsx
components/documents/document-status.tsx
components/documents/pdf-viewer.tsx
components/instructions/instruction-list.tsx
components/instructions/instruction-dialog.tsx
components/focus-area-selector.tsx
components/markdown-renderer.tsx

.env.example
docker-compose.yml
next.config.mjs
```

---

## Task 1: Scaffold Next.js 15 Project

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Run create-next-app in the current directory**

```bash
cd C:\Users\shyamd\Desktop\rag-with-nextjs
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-git
```

Answer prompts: Yes to TypeScript, Yes to ESLint, Yes to Tailwind, Yes to App Router, No to Turbopack (use default), `@/*` for import alias.

- [ ] **Step 2: Verify scaffold**

```bash
ls app/ prisma/ 2>/dev/null; cat package.json | grep '"next"'
```

Expected: `app/` directory exists, `"next": "^15` in package.json.

- [ ] **Step 3: Create uploads directory with .gitkeep**

```bash
mkdir -p uploads && touch uploads/.gitkeep
```

- [ ] **Step 4: Add uploads/ to .gitignore**

Open `.gitignore` and append:
```
uploads/*.pdf
prisma/dev.db
prisma/dev.db-journal
.env.local
```

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js 15 project"
```

---

## Task 2: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install RAG + DB dependencies**

```bash
npm install @langchain/core @langchain/openai @langchain/community @langchain/langgraph @langchain/textsplitters chromadb prisma @prisma/client zod pdf-parse
```

- [ ] **Step 2: Install UI dependencies**

```bash
npm install @tanstack/react-query @tanstack/react-table react-hook-form zustand sonner react-dropzone react-markdown remark-gfm rehype-highlight dompurify @tiptap/react @tiptap/starter-kit react-pdf
```

- [ ] **Step 3: Install type definitions**

```bash
npm install -D @types/pdf-parse @types/dompurify
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: Default style, Default base color (Slate), Yes to CSS variables.

- [ ] **Step 5: Add shadcn/ui components**

```bash
npx shadcn@latest add button input textarea select dialog popover tabs card badge table dropdown-menu tooltip separator scroll-area sheet accordion
```

- [ ] **Step 6: Verify install**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds (or only minor warnings — no errors).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: install all dependencies and shadcn/ui"
```

---

## Task 3: Environment Config

**Files:**
- Create: `lib/env.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# OpenAI
OPENAI_API_KEY=sk-...

# ChromaDB
CHROMA_URL=http://localhost:8000

# Models
CHAT_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-ada-002

# App
UPLOAD_DIR=./uploads
EOF
```

- [ ] **Step 2: Create `.env.local`** (fill in your actual key)

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `OPENAI_API_KEY` to your real key.

- [ ] **Step 3: Create `lib/env.ts`**

```typescript
import { z } from "zod"

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  CHROMA_URL: z.string().url().default("http://localhost:8000"),
  CHAT_MODEL: z.string().default("gpt-4o"),
  EMBEDDING_MODEL: z.string().default("text-embedding-ada-002"),
  UPLOAD_DIR: z.string().default("./uploads"),
})

export const env = envSchema.parse(process.env)
```

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts .env.example && git commit -m "feat: add zod-validated environment config"
```

---

## Task 4: Prisma Schema + SQLite

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Replace `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model FocusArea {
  id               String         @id @default(cuid())
  namespace        String         @unique
  name             String
  description      String?
  chromaCollection String         @unique
  createdAt        DateTime       @default(now())
  documents        Document[]
  instructions     Instruction[]
  conversations    Conversation[]
}

model Document {
  id           String    @id @default(cuid())
  name         String
  originalName String
  blobPath     String
  focusAreaId  String
  focusArea    FocusArea @relation(fields: [focusAreaId], references: [id])
  status       String
  chunkCount   Int       @default(0)
  fileSize     Int
  mimeType     String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Conversation {
  id           String                    @id @default(cuid())
  title        String?
  focusAreaId  String
  focusArea    FocusArea                 @relation(fields: [focusAreaId], references: [id])
  createdAt    DateTime                  @default(now())
  updatedAt    DateTime                  @updatedAt
  messages     Message[]
  instructions ConversationInstruction[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String
  sources        String?
  createdAt      DateTime     @default(now())
}

model Instruction {
  id                String                    @id @default(cuid())
  title             String
  content           String
  focusAreaId       String
  focusArea         FocusArea                 @relation(fields: [focusAreaId], references: [id])
  isActive          Boolean                   @default(true)
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt
  conversationLinks ConversationInstruction[]
}

model ConversationInstruction {
  conversationId String
  instructionId  String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  instruction    Instruction  @relation(fields: [instructionId], references: [id], onDelete: Cascade)

  @@id([conversationId, instructionId])
}
```

Note: `Instruction.conversationLinks` is a required Prisma back-relation — it is never read in application code.

- [ ] **Step 3: Add `DATABASE_URL` to `.env.local`**

```bash
echo 'DATABASE_URL="file:./dev.db"' >> .env.local
echo 'DATABASE_URL="file:./dev.db"' >> .env.example
```

- [ ] **Step 4: Create `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const focusAreas = [
    { namespace: "general", name: "General Knowledge", description: "General purpose knowledge base", chromaCollection: "col_general" },
    { namespace: "contracts", name: "Contract Analysis", description: "Legal contracts and agreements", chromaCollection: "col_contracts" },
    { namespace: "personal", name: "Personal Documents", description: "Personal reference documents", chromaCollection: "col_personal" },
  ]

  for (const fa of focusAreas) {
    await prisma.focusArea.upsert({
      where: { namespace: fa.namespace },
      update: {},
      create: fa,
    })
  }
  console.log("Seeded 3 focus areas")
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 5: Add seed config to `package.json`**

Add to `package.json` (inside top-level object):
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 6: Install ts-node**

```bash
npm install -D ts-node
```

- [ ] **Step 7: Push schema and seed**

```bash
npx prisma db push && npx prisma db seed
```

Expected output: `Seeded 3 focus areas`

- [ ] **Step 8: Validate schema**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 9: Commit**

```bash
git add prisma/ package.json && git commit -m "feat: add Prisma schema, SQLite DB, and seed focus areas"
```

---

## Task 5: Prisma + ChromaDB + LLM Singletons

**Files:**
- Create: `lib/prisma.ts`, `lib/chroma.ts`, `lib/llm.ts`, `lib/embeddings.ts`

- [ ] **Step 1: Create `lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create `lib/chroma.ts`**

```typescript
import { ChromaClient } from "chromadb"
import { env } from "@/lib/env"

const globalForChroma = globalThis as unknown as { chroma: ChromaClient }

export const chroma = globalForChroma.chroma ?? new ChromaClient({ path: env.CHROMA_URL })

if (process.env.NODE_ENV !== "production") globalForChroma.chroma = chroma

export async function getOrCreateCollection(name: string) {
  return chroma.getOrCreateCollection({ name })
}
```

- [ ] **Step 3: Create `lib/llm.ts`**

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { env } from "@/lib/env"

export function getLLM(temperature = 0) {
  return new ChatOpenAI({
    model: env.CHAT_MODEL,
    temperature,
    apiKey: env.OPENAI_API_KEY,
  })
}
```

- [ ] **Step 4: Create `lib/embeddings.ts`**

```typescript
import { OpenAIEmbeddings } from "@langchain/openai"
import { env } from "@/lib/env"

export function getEmbeddings() {
  return new OpenAIEmbeddings({
    model: env.EMBEDDING_MODEL,
    apiKey: env.OPENAI_API_KEY,
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/ && git commit -m "feat: add Prisma, ChromaDB, LLM, and embeddings singletons"
```

---

## Task 6: Shared Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create `types/index.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add types/ && git commit -m "feat: add shared TypeScript types"
```

---

## Task 7: Docker Compose

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - ./chroma-data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
```

- [ ] **Step 2: Start ChromaDB**

```bash
docker compose up -d chromadb
```

- [ ] **Step 3: Verify ChromaDB is running**

```bash
curl http://localhost:8000/api/v1/heartbeat
```

Expected: `{"nanosecond heartbeat": <number>}`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml && git commit -m "feat: add Docker Compose with ChromaDB"
```

---

## Task 8: RAG State + Prompts

**Files:**
- Create: `rag/state.ts`, `rag/prompts.ts`

- [ ] **Step 1: Create `rag/state.ts`**

```typescript
import { Annotation } from "@langchain/langgraph"
import type { Message, SourceDetail } from "@/types"

export const RAGStateAnnotation = Annotation.Root({
  query: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  focusArea: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  conversationId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  refinedQueries: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  documents: Annotation<SourceDetail[]>({ reducer: (_, b) => b, default: () => [] }),
  llmResponse: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  retrievalAttempts: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  citedDocumentIds: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  filteredSources: Annotation<SourceDetail[]>({ reducer: (_, b) => b, default: () => [] }),
  responseConfidence: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  conversationContext: Annotation<Message[]>({ reducer: (_, b) => b, default: () => [] }),
  activeInstructions: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
})

export type RAGState = typeof RAGStateAnnotation.State
```

- [ ] **Step 2: Create `rag/prompts.ts`**

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts"

export const refineQueryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a query refinement assistant. Your job is to rewrite and decompose user queries to improve document retrieval.

Given a user query and conversation history, produce 1-3 refined search queries that will retrieve the most relevant documents.

Respond with a JSON object: {{ "queries": ["query1", "query2"] }}`,
  ],
  [
    "human",
    `Conversation history:
{conversationHistory}

User query: {query}

Produce refined search queries as JSON.`,
  ],
])

export const gradeDocumentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a document relevance grader. Determine if a document is relevant to answer a user query.

Respond with a JSON object: {{ "relevant": true }} or {{ "relevant": false }}`,
  ],
  [
    "human",
    `Query: {query}

Document content:
{content}

Is this document relevant to the query?`,
  ],
])

export const generateResponsePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that answers questions based on provided documents.

{instructions}

Rules:
- Answer using ONLY the provided documents
- Cite documents using [DOC_N] notation inline
- If documents don't contain enough information, say so clearly
- Be concise and accurate

Respond with a JSON object:
{{
  "answer": "your answer with [DOC_N] citations",
  "citedDocumentIds": ["id1", "id2"],
  "confidence": 0.0-1.0
}}`,
  ],
  [
    "human",
    `Documents:
{documents}

Question: {query}

Answer with citations as JSON.`,
  ],
])
```

- [ ] **Step 3: Commit**

```bash
git add rag/ && git commit -m "feat: add RAG graph state and prompt templates"
```

---

## Task 9: Chunker + Indexer

**Files:**
- Create: `rag/chunker.ts`, `rag/indexer.ts`

- [ ] **Step 1: Create `rag/chunker.ts`**

```typescript
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
```

Note: Using character-based chunking (chunkSize: 1000 chars) instead of token-based to avoid tiktoken native bindings complexity in Next.js. Adjust if needed.

- [ ] **Step 2: Create `rag/indexer.ts`**

```typescript
import fs from "fs"
import path from "path"
import pdfParse from "pdf-parse"
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
    const pages = rawPages.map((text, i) => ({ text, pageNumber: i + 1 }))

    const chunks = await chunkPages(pages, {
      documentId: doc.id,
      documentName: doc.originalName,
      focusArea: doc.focusArea.namespace,
    })

    const embeddings = getEmbeddings()
    const collection = await getOrCreateCollection(doc.focusArea.chromaCollection)

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
```

- [ ] **Step 3: Commit**

```bash
git add rag/chunker.ts rag/indexer.ts && git commit -m "feat: add PDF chunker and indexing pipeline"
```

---

## Task 10: RAG Nodes

**Files:**
- Create: `rag/nodes/refine-query.ts`, `rag/nodes/retrieve.ts`, `rag/nodes/grade-documents.ts`, `rag/nodes/generate.ts`

- [ ] **Step 1: Create `rag/nodes/refine-query.ts`**

```typescript
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
```

- [ ] **Step 2: Create `rag/nodes/retrieve.ts`**

```typescript
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
```

- [ ] **Step 3: Create `rag/nodes/grade-documents.ts`**

```typescript
import { getLLM } from "@/lib/llm"
import { gradeDocumentPrompt } from "@/rag/prompts"
import type { RAGState } from "@/rag/state"
import type { SourceDetail } from "@/types"

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
```

- [ ] **Step 4: Create `rag/nodes/generate.ts`**

```typescript
import { z } from "zod"
import { getLLM } from "@/lib/llm"
import { generateResponsePrompt } from "@/rag/prompts"
import type { RAGState } from "@/rag/state"
import type { SourceDetail } from "@/types"

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
```

- [ ] **Step 5: Commit**

```bash
git add rag/nodes/ && git commit -m "feat: add RAG nodes (refine, retrieve, grade, generate)"
```

---

## Task 11: Assemble LangGraph

**Files:**
- Create: `rag/graph.ts`

- [ ] **Step 1: Create `rag/graph.ts`**

```typescript
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
  // Load conversation context
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

  // Load active instructions for the conversation
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
    sources: result.filteredSources.map((s) => ({
      documentId: s.documentId,
      documentName: s.documentName,
      pageNumber: s.pageNumber,
      content: s.content,
    })),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rag/graph.ts && git commit -m "feat: assemble LangGraph RAG pipeline"
```

---

## Task 12: API — Focus Areas + Documents

**Files:**
- Create: `app/api/focus-areas/route.ts`, `app/api/documents/route.ts`, `app/api/documents/[id]/route.ts`, `app/api/documents/index/route.ts`

- [ ] **Step 1: Create `app/api/focus-areas/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const focusAreas = await prisma.focusArea.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(focusAreas)
}
```

- [ ] **Step 2: Create `app/api/documents/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")
  const search = searchParams.get("search") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 20

  const where = {
    ...(focusArea ? { focusArea: { namespace: focusArea } } : {}),
    ...(search ? { originalName: { contains: search } } : {}),
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { focusArea: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ documents, total, page, pageSize })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const focusAreaId = formData.get("focusAreaId") as string | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!focusAreaId) return NextResponse.json({ error: "focusAreaId required" }, { status: 400 })
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })

  const focusArea = await prisma.focusArea.findUnique({ where: { id: focusAreaId } })
  if (!focusArea) return NextResponse.json({ error: "Focus area not found" }, { status: 404 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
  const blobPath = path.join(env.UPLOAD_DIR, fileName)
  await writeFile(blobPath, buffer)

  const document = await prisma.document.create({
    data: {
      name: fileName,
      originalName: file.name,
      blobPath,
      focusAreaId,
      status: "UPLOADING",
      fileSize: file.size,
      mimeType: file.type,
    },
  })

  return NextResponse.json(document, { status: 201 })
}
```

- [ ] **Step 3: Create `app/api/documents/[id]/route.ts`**

```typescript
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
```

- [ ] **Step 4: Create `app/api/documents/index/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { indexDocument } from "@/rag/indexer"

export async function POST(req: NextRequest) {
  const { documentId } = await req.json()
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 })

  try {
    await indexDocument(documentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/ && git commit -m "feat: add focus-areas and documents API routes"
```

---

## Task 13: API — Chat + Conversations

**Files:**
- Create: `app/api/chat/route.ts`, `app/api/conversations/route.ts`, `app/api/conversations/[id]/route.ts`

- [ ] **Step 1: Create `app/api/chat/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processQuery } from "@/rag/graph"

export async function POST(req: NextRequest) {
  const { question, focusArea, conversationId } = await req.json()

  if (!question || !focusArea) {
    return NextResponse.json({ error: "question and focusArea are required" }, { status: 400 })
  }

  const focusAreaRecord = await prisma.focusArea.findUnique({ where: { namespace: focusArea } })
  if (!focusAreaRecord) return NextResponse.json({ error: "Focus area not found" }, { status: 404 })

  // Create or retrieve conversation
  let convoId = conversationId
  if (!convoId) {
    const convo = await prisma.conversation.create({
      data: {
        focusAreaId: focusAreaRecord.id,
        title: question.slice(0, 60),
      },
    })
    convoId = convo.id
  }

  // Save user message
  await prisma.message.create({
    data: { conversationId: convoId, role: "user", content: question },
  })

  // Run RAG pipeline
  const result = await processQuery(question, focusArea, convoId)

  // Save assistant message
  await prisma.message.create({
    data: {
      conversationId: convoId,
      role: "assistant",
      content: result.answer,
      sources: JSON.stringify(result.sources),
    },
  })

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: convoId },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ ...result, conversationId: convoId })
}
```

- [ ] **Step 2: Create `app/api/conversations/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")

  const conversations = await prisma.conversation.findMany({
    where: focusArea ? { focusArea: { namespace: focusArea } } : {},
    include: { focusArea: true },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(conversations)
}
```

- [ ] **Step 3: Create `app/api/conversations/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      focusArea: true,
    },
  })
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...conversation,
    messages: conversation.messages.map((m) => ({
      ...m,
      sources: m.sources ? JSON.parse(m.sources) : null,
    })),
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.conversation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/ app/api/conversations/ && git commit -m "feat: add chat and conversations API routes"
```

---

## Task 14: API — Instructions + Conversation Instructions

**Files:**
- Create: `app/api/instructions/route.ts`, `app/api/instructions/[id]/route.ts`, `app/api/conversations/[id]/instructions/route.ts`, `app/api/conversations/[id]/instructions/[instructionId]/route.ts`

- [ ] **Step 1: Create `app/api/instructions/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")

  const instructions = await prisma.instruction.findMany({
    where: focusArea ? { focusArea: { namespace: focusArea } } : {},
    include: { focusArea: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(instructions)
}

export async function POST(req: NextRequest) {
  const { title, content, focusAreaId } = await req.json()
  if (!title || !content || !focusAreaId) {
    return NextResponse.json({ error: "title, content, and focusAreaId are required" }, { status: 400 })
  }

  const instruction = await prisma.instruction.create({
    data: { title, content, focusAreaId },
  })
  return NextResponse.json(instruction, { status: 201 })
}
```

- [ ] **Step 2: Create `app/api/instructions/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title, content, isActive } = await req.json()

  const instruction = await prisma.instruction.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(isActive !== undefined && { isActive }) },
  })
  return NextResponse.json(instruction)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.instruction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create `app/api/conversations/[id]/instructions/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const links = await prisma.conversationInstruction.findMany({
    where: { conversationId: id },
    include: { instruction: true },
  })
  return NextResponse.json(links.map((l) => l.instruction))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { instructionId } = await req.json()
  if (!instructionId) return NextResponse.json({ error: "instructionId required" }, { status: 400 })

  await prisma.conversationInstruction.upsert({
    where: { conversationId_instructionId: { conversationId: id, instructionId } },
    update: {},
    create: { conversationId: id, instructionId },
  })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Create `app/api/conversations/[id]/instructions/[instructionId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; instructionId: string }> }
) {
  const { id, instructionId } = await params

  await prisma.conversationInstruction.delete({
    where: { conversationId_instructionId: { conversationId: id, instructionId } },
  })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/instructions/ app/api/conversations/ && git commit -m "feat: add instructions and conversation-instructions API routes"
```

---

## Task 15: Zustand Stores + TanStack Query Hooks

**Files:**
- Create: `store/use-focus-area-store.ts`, `store/use-chat-store.ts`
- Create: `hooks/api/use-focus-areas.ts`, `hooks/api/use-conversations.ts`, `hooks/api/use-chat.ts`, `hooks/api/use-documents.ts`, `hooks/api/use-instructions.ts`

- [ ] **Step 1: Create `store/use-focus-area-store.ts`**

```typescript
import { create } from "zustand"
import type { FocusArea } from "@/types"

interface FocusAreaStore {
  focusAreas: FocusArea[]
  selectedNamespace: string | null
  setFocusAreas: (areas: FocusArea[]) => void
  setSelectedNamespace: (ns: string) => void
  selectedFocusArea: () => FocusArea | null
}

export const useFocusAreaStore = create<FocusAreaStore>((set, get) => ({
  focusAreas: [],
  selectedNamespace: null,
  setFocusAreas: (areas) => set({ focusAreas: areas }),
  setSelectedNamespace: (ns) => set({ selectedNamespace: ns }),
  selectedFocusArea: () => {
    const { focusAreas, selectedNamespace } = get()
    return focusAreas.find((f) => f.namespace === selectedNamespace) ?? null
  },
}))
```

- [ ] **Step 2: Create `store/use-chat-store.ts`**

```typescript
import { create } from "zustand"
import type { Message } from "@/types"

interface ConversationState {
  messages: Message[]
  pending: boolean
}

interface ChatStore {
  conversations: Record<string, ConversationState>
  addMessage: (conversationId: string, message: Message) => void
  setPending: (conversationId: string, pending: boolean) => void
  setMessages: (conversationId: string, messages: Message[]) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: {},
  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          messages: [...(state.conversations[conversationId]?.messages ?? []), message],
          pending: state.conversations[conversationId]?.pending ?? false,
        },
      },
    })),
  setPending: (conversationId, pending) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          messages: state.conversations[conversationId]?.messages ?? [],
          pending,
        },
      },
    })),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: { messages, pending: false },
      },
    })),
}))
```

- [ ] **Step 3: Create `hooks/api/use-focus-areas.ts`**

```typescript
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import type { FocusArea } from "@/types"

export function useFocusAreas() {
  const setFocusAreas = useFocusAreaStore((s) => s.setFocusAreas)

  const query = useQuery<FocusArea[]>({
    queryKey: ["focus-areas"],
    queryFn: () => fetch("/api/focus-areas").then((r) => r.json()),
  })

  useEffect(() => {
    if (query.data) setFocusAreas(query.data)
  }, [query.data, setFocusAreas])

  return query
}
```

- [ ] **Step 4: Create `hooks/api/use-conversations.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Conversation, Message } from "@/types"

export function useConversations(focusArea?: string) {
  return useQuery<Conversation[]>({
    queryKey: ["conversations", focusArea],
    queryFn: () =>
      fetch(`/api/conversations${focusArea ? `?focusArea=${focusArea}` : ""}`).then((r) => r.json()),
  })
}

export function useConversation(id: string | undefined) {
  return useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["conversation", id],
    queryFn: () => fetch(`/api/conversations/${id}`).then((r) => r.json()),
    enabled: !!id,
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/conversations/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  })
}

export function useConversationInstructions(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["conversation-instructions", conversationId],
    queryFn: () => fetch(`/api/conversations/${conversationId}/instructions`).then((r) => r.json()),
    enabled: !!conversationId,
  })
}

export function useAddConversationInstruction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (instructionId: string) =>
      fetch(`/api/conversations/${conversationId}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructionId }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-instructions", conversationId] }),
  })
}

export function useRemoveConversationInstruction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (instructionId: string) =>
      fetch(`/api/conversations/${conversationId}/instructions/${instructionId}`, {
        method: "DELETE",
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation-instructions", conversationId] }),
  })
}
```

- [ ] **Step 5: Create `hooks/api/use-chat.ts`**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ChatRequest, ChatResponse } from "@/types"

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: (body) =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Chat request failed")
        return r.json()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  })
}
```

- [ ] **Step 6: Create `hooks/api/use-documents.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Document } from "@/types"

export function useDocuments(focusArea?: string, search?: string, page = 1) {
  const params = new URLSearchParams()
  if (focusArea) params.set("focusArea", focusArea)
  if (search) params.set("search", search)
  params.set("page", String(page))

  return useQuery<{ documents: Document[]; total: number }>({
    queryKey: ["documents", focusArea, search, page],
    queryFn: () => fetch(`/api/documents?${params}`).then((r) => r.json()),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, focusAreaId }: { file: File; focusAreaId: string }) => {
      const form = new FormData()
      form.append("file", file)
      form.append("focusAreaId", focusAreaId)
      return fetch("/api/documents", { method: "POST", body: form }).then((r) => r.json())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}

export function useIndexDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      fetch("/api/documents/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  })
}
```

- [ ] **Step 7: Create `hooks/api/use-instructions.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Instruction } from "@/types"

export function useInstructions(focusArea?: string) {
  return useQuery<Instruction[]>({
    queryKey: ["instructions", focusArea],
    queryFn: () =>
      fetch(`/api/instructions${focusArea ? `?focusArea=${focusArea}` : ""}`).then((r) => r.json()),
  })
}

export function useCreateInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; content: string; focusAreaId: string }) =>
      fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}

export function useUpdateInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string; isActive?: boolean }) =>
      fetch(`/api/instructions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}

export function useDeleteInstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/instructions/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructions"] }),
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add store/ hooks/ && git commit -m "feat: add Zustand stores and TanStack Query hooks"
```

---

## Task 16: Root Layout + Shared Components

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`
- Create: `components/markdown-renderer.tsx`, `components/focus-area-selector.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

```typescript
"use client"
import "./globals.css"
import { Inter } from "next/font/google"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useState } from "react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update `app/page.tsx`**

```typescript
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/chat")
}
```

- [ ] **Step 3: Create `components/markdown-renderer.tsx`**

```typescript
"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import DOMPurify from "dompurify"
import "highlight.js/styles/github.css"

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  const clean = typeof window !== "undefined" ? DOMPurify.sanitize(content) : content
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="prose prose-sm max-w-none dark:prose-invert"
    >
      {clean}
    </ReactMarkdown>
  )
}
```

- [ ] **Step 4: Create `components/focus-area-selector.tsx`**

```typescript
"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFocusAreas } from "@/hooks/api/use-focus-areas"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

interface Props {
  value?: string
  onChange?: (namespace: string) => void
  placeholder?: string
}

export function FocusAreaSelector({ value, onChange, placeholder = "Select focus area" }: Props) {
  useFocusAreas()
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {focusAreas.map((fa) => (
          <SelectItem key={fa.namespace} value={fa.namespace}>
            {fa.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx components/markdown-renderer.tsx components/focus-area-selector.tsx && git commit -m "feat: add root layout, providers, markdown renderer, focus area selector"
```

---

## Task 17: Layout Components

**Files:**
- Create: `components/layout/app-shell.tsx`, `components/layout/sidebar.tsx`, `components/layout/header.tsx`

- [ ] **Step 1: Create `components/layout/header.tsx`**

```typescript
"use client"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

export function Header() {
  const selected = useFocusAreaStore((s) => s.selectedFocusArea())
  return (
    <header className="border-b px-6 py-3 flex items-center justify-between bg-background">
      <h1 className="text-lg font-semibold">simple-rag</h1>
      {selected && (
        <span className="text-sm text-muted-foreground">
          Focus: <span className="font-medium text-foreground">{selected.name}</span>
        </span>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Create `components/layout/sidebar.tsx`**

```typescript
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, FileText, BookOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/api/use-conversations"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

export function Sidebar() {
  const pathname = usePathname()
  const selectedNs = useFocusAreaStore((s) => s.selectedNamespace)
  const { data: conversations = [] } = useConversations(selectedNs ?? undefined)

  const navLinks = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/instructions", label: "Instructions", icon: BookOpen },
  ]

  return (
    <aside className="w-64 border-r flex flex-col bg-background">
      <div className="p-4 border-b">
        <Link href="/chat">
          <Button className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </Link>
      </div>

      <nav className="p-2 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={pathname.startsWith(href) ? "secondary" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Icon className="w-4 h-4 mr-2" /> {label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Recent Conversations
        </p>
        <ScrollArea className="h-full">
          <div className="px-2 space-y-1 pb-4">
            {conversations.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <Button
                  variant={pathname === `/chat/${c.id}` ? "secondary" : "ghost"}
                  className="w-full justify-start text-left truncate"
                  size="sm"
                >
                  <span className="truncate">{c.title ?? "Untitled"}</span>
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create `components/layout/app-shell.tsx`**

```typescript
import { Header } from "./header"
import { Sidebar } from "./sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/ && git commit -m "feat: add AppShell, Sidebar, and Header layout components"
```

---

## Task 18: Chat Components

**Files:**
- Create: `components/chat/message-bubble.tsx`, `components/chat/sources-panel.tsx`, `components/chat/message-list.tsx`, `components/chat/instruction-picker.tsx`, `components/chat/chat-input.tsx`, `components/chat/chat-view.tsx`

- [ ] **Step 1: Create `components/chat/message-bubble.tsx`**

```typescript
"use client"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import type { Message } from "@/types"

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {message.sources.length} source{message.sources.length !== 1 ? "s" : ""} cited
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/chat/sources-panel.tsx`**

```typescript
"use client"
import { FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Source } from "@/types"

export function SourcesPanel({ sources }: { sources: Source[] }) {
  if (!sources.length) return null
  return (
    <div className="border-l w-72 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">Sources ({sources.length})</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {sources.map((s, i) => (
            <div key={i} className="rounded border p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="font-medium truncate">{s.documentName}</span>
                <Badge variant="outline" className="ml-auto shrink-0">p.{s.pageNumber}</Badge>
              </div>
              <p className="text-muted-foreground line-clamp-3">{s.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/chat/message-list.tsx`**

```typescript
"use client"
import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"
import type { Message } from "@/types"

export function MessageList({ messages, pending }: { messages: Message[]; pending: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pending])

  return (
    <ScrollArea className="flex-1 p-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {pending && (
        <div className="flex justify-start mb-4">
          <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground animate-pulse">
            Thinking...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </ScrollArea>
  )
}
```

- [ ] **Step 4: Create `components/chat/instruction-picker.tsx`**

```typescript
"use client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings2, X } from "lucide-react"
import { useInstructions } from "@/hooks/api/use-instructions"
import {
  useConversationInstructions,
  useAddConversationInstruction,
  useRemoveConversationInstruction,
} from "@/hooks/api/use-conversations"
import type { Instruction } from "@/types"

interface Props {
  conversationId: string
  focusArea: string
}

export function InstructionPicker({ conversationId, focusArea }: Props) {
  const { data: all = [] } = useInstructions(focusArea)
  const { data: active = [] } = useConversationInstructions(conversationId)
  const add = useAddConversationInstruction(conversationId)
  const remove = useRemoveConversationInstruction(conversationId)

  const activeIds = new Set((active as Instruction[]).map((i) => i.id))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-1" />
          Instructions
          {activeIds.size > 0 && (
            <Badge variant="secondary" className="ml-1">{activeIds.size}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Active instructions</p>
        {(all as Instruction[]).map((inst) => {
          const isActive = activeIds.has(inst.id)
          return (
            <div key={inst.id} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{inst.title}</span>
              {isActive ? (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(inst.id)}>
                  <X className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => add.mutate(inst.id)}>
                  Add
                </Button>
              )}
            </div>
          )
        })}
        {(all as Instruction[]).length === 0 && (
          <p className="text-xs text-muted-foreground">No instructions for this focus area</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 5: Create `components/chat/chat-input.tsx`**

```typescript
"use client"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { InstructionPicker } from "./instruction-picker"

interface Props {
  onSend: (question: string) => void
  pending: boolean
  conversationId?: string
  focusArea: string
  onFocusAreaChange: (ns: string) => void
}

export function ChatInput({ onSend, pending, conversationId, focusArea, onFocusAreaChange }: Props) {
  const [text, setText] = useState("")

  const handleSend = () => {
    if (!text.trim() || pending) return
    onSend(text.trim())
    setText("")
  }

  return (
    <div className="border-t p-4 space-y-2">
      <div className="flex gap-2 items-center">
        <FocusAreaSelector value={focusArea} onChange={onFocusAreaChange} />
        {conversationId && (
          <InstructionPicker conversationId={conversationId} focusArea={focusArea} />
        )}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question..."
          className="resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button onClick={handleSend} disabled={pending || !text.trim()} size="icon" className="self-end h-10 w-10">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `components/chat/chat-view.tsx`**

```typescript
"use client"
import { useEffect } from "react"
import { toast } from "sonner"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { SourcesPanel } from "./sources-panel"
import { useSendMessage } from "@/hooks/api/use-chat"
import { useChatStore } from "@/store/use-chat-store"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useConversation } from "@/hooks/api/use-conversations"
import type { Message, Source } from "@/types"

interface Props {
  conversationId?: string
}

export function ChatView({ conversationId }: Props) {
  const sendMessage = useSendMessage()
  const { conversations, addMessage, setPending, setMessages } = useChatStore()
  const { selectedNamespace, setSelectedNamespace } = useFocusAreaStore()

  const focusArea = selectedNamespace ?? ""
  const state = conversations[conversationId ?? "new"] ?? { messages: [], pending: false }

  const { data: existing } = useConversation(conversationId)

  useEffect(() => {
    if (existing?.messages && conversationId) {
      setMessages(conversationId, existing.messages)
    }
  }, [existing, conversationId, setMessages])

  const lastAssistantSources: Source[] =
    [...state.messages].reverse().find((m) => m.role === "assistant")?.sources ?? []

  const handleSend = async (question: string) => {
    if (!focusArea) {
      toast.error("Please select a focus area first")
      return
    }

    const tempUserMsg: Message = {
      id: `tmp-${Date.now()}`,
      conversationId: conversationId ?? "new",
      role: "user",
      content: question,
      sources: null,
      createdAt: new Date().toISOString(),
    }

    const convoKey = conversationId ?? "new"
    addMessage(convoKey, tempUserMsg)
    setPending(convoKey, true)

    try {
      const result = await sendMessage.mutateAsync({ question, focusArea, conversationId })

      const assistantMsg: Message = {
        id: `tmp-assistant-${Date.now()}`,
        conversationId: result.conversationId,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        createdAt: new Date().toISOString(),
      }

      if (!conversationId) {
        setMessages(result.conversationId, [tempUserMsg, assistantMsg])
        window.history.replaceState(null, "", `/chat/${result.conversationId}`)
      } else {
        addMessage(convoKey, assistantMsg)
      }
    } catch {
      toast.error("Failed to get a response")
    } finally {
      setPending(convoKey, false)
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">
        <MessageList messages={state.messages} pending={state.pending} />
        <ChatInput
          onSend={handleSend}
          pending={state.pending}
          conversationId={conversationId}
          focusArea={focusArea}
          onFocusAreaChange={setSelectedNamespace}
        />
      </div>
      <SourcesPanel sources={lastAssistantSources} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/chat/ && git commit -m "feat: add all chat components"
```

---

## Task 19: Chat Pages

**Files:**
- Modify: `app/chat/page.tsx`, create `app/chat/[conversationId]/page.tsx`

- [ ] **Step 1: Update `app/chat/page.tsx`**

```typescript
import { AppShell } from "@/components/layout/app-shell"
import { ChatView } from "@/components/chat/chat-view"

export default function ChatPage() {
  return (
    <AppShell>
      <ChatView />
    </AppShell>
  )
}
```

- [ ] **Step 2: Create `app/chat/[conversationId]/page.tsx`**

```typescript
import { AppShell } from "@/components/layout/app-shell"
import { ChatView } from "@/components/chat/chat-view"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  return (
    <AppShell>
      <ChatView conversationId={conversationId} />
    </AppShell>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/chat/ && git commit -m "feat: add chat pages"
```

---

## Task 20: Document Components + Page

**Files:**
- Create: `components/documents/document-status.tsx`, `components/documents/document-table.tsx`, `components/documents/upload-dialog.tsx`, `components/documents/pdf-viewer.tsx`, `app/documents/page.tsx`

- [ ] **Step 1: Create `components/documents/document-status.tsx`**

```typescript
import { Badge } from "@/components/ui/badge"
import type { DocumentStatus } from "@/types"

const statusConfig: Record<DocumentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  UPLOADING: { label: "Uploading", variant: "secondary" },
  INDEXING: { label: "Indexing", variant: "secondary" },
  INDEXED: { label: "Indexed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
}

export function DocumentStatus({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
```

- [ ] **Step 2: Create `components/documents/upload-dialog.tsx`**

```typescript
"use client"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useUploadDocument, useIndexDocument } from "@/hooks/api/use-documents"
import { useFocusAreas } from "@/hooks/api/use-focus-areas"

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [focusAreaNs, setFocusAreaNs] = useState<string>("")
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)
  useFocusAreas()

  const upload = useUploadDocument()
  const index = useIndexDocument()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
  })

  const handleUpload = async () => {
    const fa = focusAreas.find((f) => f.namespace === focusAreaNs)
    if (!fa) { toast.error("Select a focus area"); return }
    if (!files.length) { toast.error("Select at least one file"); return }

    for (const file of files) {
      try {
        const doc = await upload.mutateAsync({ file, focusAreaId: fa.id })
        toast.info(`Uploading ${file.name}...`)
        await index.mutateAsync(doc.id)
        toast.success(`${file.name} indexed successfully`)
      } catch {
        toast.error(`Failed to process ${file.name}`)
      }
    }
    setFiles([])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Upload className="w-4 h-4 mr-2" /> Upload PDF</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload PDF Documents</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FocusAreaSelector value={focusAreaNs} onChange={setFocusAreaNs} placeholder="Select focus area" />
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop PDF files here" : "Drag & drop PDFs, or click to select"}
            </p>
          </div>
          {files.length > 0 && (
            <ul className="text-sm space-y-1">
              {files.map((f, i) => <li key={i} className="truncate text-muted-foreground">• {f.name}</li>)}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={upload.isPending || index.isPending}>
              Upload & Index
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create `components/documents/document-table.tsx`**

```typescript
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { DocumentStatus } from "./document-status"
import { useDocuments, useDeleteDocument } from "@/hooks/api/use-documents"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import type { Document } from "@/types"

export function DocumentTable() {
  const [focusArea, setFocusArea] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDocuments(focusArea || undefined, search || undefined, page)
  const deleteDoc = useDeleteDocument()

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.originalName}"?`)) return
    try {
      await deleteDoc.mutateAsync(doc.id)
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <FocusAreaSelector value={focusArea} onChange={setFocusArea} placeholder="All focus areas" />
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Focus Area</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Size</th>
                <th className="text-left p-3">Chunks</th>
                <th className="text-left p-3">Date</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.documents ?? []).map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-3 max-w-xs truncate">{doc.originalName}</td>
                  <td className="p-3">{(doc as any).focusArea?.name ?? ""}</td>
                  <td className="p-3"><DocumentStatus status={doc.status as any} /></td>
                  <td className="p-3">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                  <td className="p-3">{doc.chunkCount}</td>
                  <td className="p-3">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data?.documents ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No documents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{data?.total ?? 0} documents</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={!data || page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/documents/pdf-viewer.tsx`**

```typescript
"use client"
import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  return (
    <div className="flex flex-col items-center gap-2">
      <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNumber} width={600} />
      </Document>
      <div className="flex items-center gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>Prev</Button>
        <span>Page {pageNumber} of {numPages}</span>
        <Button variant="outline" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>Next</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/documents/page.tsx`**

```typescript
import { AppShell } from "@/components/layout/app-shell"
import { DocumentTable } from "@/components/documents/document-table"
import { UploadDialog } from "@/components/documents/upload-dialog"

export default function DocumentsPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Documents</h2>
          <UploadDialog />
        </div>
        <DocumentTable />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add components/documents/ app/documents/ && git commit -m "feat: add document components and documents page"
```

---

## Task 21: Instruction Components + Page

**Files:**
- Create: `components/instructions/instruction-dialog.tsx`, `components/instructions/instruction-list.tsx`, `app/instructions/page.tsx`

- [ ] **Step 1: Create `components/instructions/instruction-dialog.tsx`**

```typescript
"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { toast } from "sonner"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import { useCreateInstruction, useUpdateInstruction } from "@/hooks/api/use-instructions"
import type { Instruction } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
  instruction?: Instruction
}

export function InstructionDialog({ open, onClose, instruction }: Props) {
  const [title, setTitle] = useState("")
  const [focusAreaNs, setFocusAreaNs] = useState("")
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)

  const create = useCreateInstruction()
  const update = useUpdateInstruction()

  const editor = useEditor({
    extensions: [StarterKit],
    content: instruction?.content ?? "",
  })

  useEffect(() => {
    if (instruction) {
      setTitle(instruction.title)
      const fa = focusAreas.find((f) => f.id === instruction.focusAreaId)
      if (fa) setFocusAreaNs(fa.namespace)
      editor?.commands.setContent(instruction.content)
    } else {
      setTitle("")
      editor?.commands.setContent("")
    }
  }, [instruction, open, editor, focusAreas])

  const handleSave = async () => {
    const content = editor?.getHTML() ?? ""
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return }

    try {
      if (instruction) {
        await update.mutateAsync({ id: instruction.id, title, content })
        toast.success("Instruction updated")
      } else {
        const fa = focusAreas.find((f) => f.namespace === focusAreaNs)
        if (!fa) { toast.error("Select a focus area"); return }
        await create.mutateAsync({ title, content, focusAreaId: fa.id })
        toast.success("Instruction created")
      }
      onClose()
    } catch {
      toast.error("Failed to save instruction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{instruction ? "Edit Instruction" : "New Instruction"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          {!instruction && (
            <FocusAreaSelector value={focusAreaNs} onChange={setFocusAreaNs} placeholder="Select focus area" />
          )}
          <div className="border rounded-md p-3 min-h-40 prose prose-sm max-w-none">
            <EditorContent editor={editor} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `components/instructions/instruction-list.tsx`**

```typescript
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { InstructionDialog } from "./instruction-dialog"
import { FocusAreaSelector } from "@/components/focus-area-selector"
import { useInstructions, useDeleteInstruction } from "@/hooks/api/use-instructions"
import type { Instruction } from "@/types"

export function InstructionList() {
  const [focusArea, setFocusArea] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Instruction | undefined>()

  const { data: instructions = [], isLoading } = useInstructions(focusArea || undefined)
  const deleteInstruction = useDeleteInstruction()

  const handleDelete = async (inst: Instruction) => {
    if (!confirm(`Delete "${inst.title}"?`)) return
    try {
      await deleteInstruction.mutateAsync(inst.id)
      toast.success("Instruction deleted")
    } catch {
      toast.error("Failed to delete instruction")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FocusAreaSelector value={focusArea} onChange={setFocusArea} placeholder="All focus areas" />
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> New Instruction
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Focus Area</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Updated</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(instructions as Instruction[]).map((inst) => (
                <tr key={inst.id} className="border-t">
                  <td className="p-3">{inst.title}</td>
                  <td className="p-3">{(inst as any).focusArea?.name ?? ""}</td>
                  <td className="p-3">
                    <Badge variant={inst.isActive ? "default" : "secondary"}>
                      {inst.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">{new Date(inst.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(inst); setDialogOpen(true) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inst)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(instructions as Instruction[]).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No instructions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <InstructionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        instruction={editing}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/instructions/page.tsx`**

```typescript
import { AppShell } from "@/components/layout/app-shell"
import { InstructionList } from "@/components/instructions/instruction-list"

export default function InstructionsPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Instructions</h2>
        <InstructionList />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/instructions/ app/instructions/ && git commit -m "feat: add instruction components and instructions page"
```

---

## Task 22: Next.js Config + Final Build Check

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Update `next.config.mjs` for server-side packages**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "chromadb", "@prisma/client"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas"]
    }
    return config
  },
}

export default nextConfig
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors before proceeding.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes without errors. Warnings about `pdf-parse` or `canvas` are acceptable.

- [ ] **Step 4: Start dev server and verify UI loads**

```bash
npm run dev
```

Open `http://localhost:3000` — should redirect to `/chat`. Verify sidebar shows navigation links and focus area selector appears.

- [ ] **Step 5: End-to-end smoke test**

With ChromaDB running (`docker compose up -d`):

1. Go to `/documents` → click "Upload PDF" → select a focus area + PDF → click "Upload & Index" → verify status becomes INDEXED
2. Go to `/chat` → select same focus area → type a question → verify answer with sources appears
3. Go to `/instructions` → create an instruction → go back to chat → open Instruction picker → attach the instruction → ask a question → verify response reflects instruction

- [ ] **Step 6: Commit final**

```bash
git add next.config.mjs && git commit -m "feat: configure Next.js for server packages and complete simple-rag build"
```

---

## Self-Review

**Spec coverage:**
- [x] Focus area scoping → one ChromaDB collection per focus area, retrieval filtered by namespace
- [x] Document management (upload, index, delete) → Tasks 12, 20
- [x] Conversation persistence → Prisma Message + Conversation models, chat API saves all messages
- [x] Instruction management → Tasks 14, 21
- [x] Conversation-level instructions → ConversationInstruction join table, chat API loads + injects into prompt
- [x] LangGraph pipeline (refine → retrieve → grade → generate) → Tasks 8-11
- [x] PDF-only parsing → pdf-parse in indexer, mimeType validation in upload route
- [x] OpenAI only → lib/llm.ts and lib/embeddings.ts use ChatOpenAI/OpenAIEmbeddings
- [x] No streaming → all routes return complete JSON
- [x] shadcn/ui components → Task 2
- [x] Seeded focus areas → Task 4 seed.ts
- [x] Docker Compose for ChromaDB → Task 7
- [x] Environment validation → lib/env.ts with zod

**No placeholders found.** All tasks contain concrete code.

**Type consistency check:**
- `SourceDetail` defined in `types/index.ts`, used in `rag/state.ts`, `rag/nodes/retrieve.ts`, `rag/nodes/generate.ts` ✓
- `Source` used in `types/index.ts` and `components/chat/sources-panel.tsx` ✓
- `processQuery` returns `ChatResponse` — matches `types/index.ts` definition ✓
- `RAGState` from `rag/state.ts` used consistently in all nodes ✓
