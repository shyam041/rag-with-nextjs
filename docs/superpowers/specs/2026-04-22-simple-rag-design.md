# simple-rag Design Spec

**Date:** 2026-04-22  
**Project:** simple-rag  
**Status:** Approved

---

## TL;DR

Build `simple-rag` as a single Next.js 15 application (App Router) implementing a full RAG pipeline using LangChain.js and LangGraph.js. No separate backend. No auth. PDF-only document ingestion. OpenAI for LLM and embeddings. ChromaDB for vector storage. SQLite + Prisma for metadata and conversation history.

---

## Architecture

```
simple-rag/
├── Next.js 15 (App Router)          # Framework
├── shadcn/ui + Tailwind CSS         # UI components
├── LangChain.js + LangGraph.js      # RAG pipeline orchestration
├── ChromaDB (Docker)                # Vector store (one collection per focus area)
├── SQLite + Prisma                  # Metadata, conversations, instructions
├── pdf-parse                        # PDF document parsing
├── OpenAI (gpt-4o + ada-002)       # LLM + embeddings
└── uploads/                         # Local file storage
```

**Key decisions:**
- OpenAI only — no Azure branching
- PDF only — no DOCX, TXT, MD support
- No streaming — responses returned as complete JSON
- No auth — single-user, open access
- No Unstructured.io — replaced by `pdf-parse`
- Local file storage — `uploads/` directory, not cloud blob

---

## Database Schema (Prisma + SQLite)

```prisma
model FocusArea {
  id               String        @id @default(cuid())
  namespace        String        @unique
  name             String
  description      String?
  chromaCollection String        @unique
  createdAt        DateTime      @default(now())
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
  status       String    // UPLOADING | INDEXING | INDEXED | FAILED
  chunkCount   Int       @default(0)
  fileSize     Int
  mimeType     String    // always "application/pdf"
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
  role           String       // "user" | "assistant"
  content        String
  sources        String?      // JSON array of source references
  createdAt      DateTime     @default(now())
}

model Instruction {
  id          String    @id @default(cuid())
  title       String
  content     String
  focusAreaId String
  focusArea   FocusArea @relation(fields: [focusAreaId], references: [id])
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  // no back-relation to conversations — instructions are generic, reusable across any conversation
}

model ConversationInstruction {
  conversationId String
  instructionId  String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  instruction    Instruction  @relation(fields: [instructionId], references: [id], onDelete: Cascade)
  @@id([conversationId, instructionId])
}
```

**Seeded focus areas:**

| namespace   | name               |
|-------------|--------------------|
| `general`   | General Knowledge  |
| `contracts` | Contract Analysis  |
| `personal`  | Personal Documents |

**Document status flow:** `UPLOADING → INDEXING → INDEXED / FAILED`

---

## RAG Pipeline (LangGraph)

### Graph

```
START → refineDecomposeQueries → retrieve → gradeDocuments
                                                  ↓
                            (relevant) → generate → END
                            (not relevant, attempts < 2) → refineDecomposeQueries
                            (not relevant, attempts ≥ 2) → generate → END
```

### Nodes

| Node | Responsibility |
|---|---|
| `refineDecomposeQueries` | Rewrites the user query using conversation history; decomposes into sub-queries if needed |
| `retrieve` | Searches ChromaDB for each sub-query using similarity search with score threshold; deduplicates |
| `gradeDocuments` | LLM grades each retrieved doc as relevant/not-relevant; routes to retry or generate |
| `generate` | Formats docs as `DOC_1, DOC_2...`; generates answer with citations via structured output (zod); injects all conversation-associated instructions into system prompt |

### Graph State

```typescript
{
  query: string
  focusArea: string
  conversationId: string
  refinedQueries: string[]
  documents: Document[]
  sourceDetails: SourceDetail[]
  llmResponse: string
  retrievalAttempts: number
  citedDocumentIds: string[]
  filteredSources: SourceDetail[]
  responseConfidence: number
  conversationContext: Message[]
  activeInstructions: string[]  // content of all conversation-associated instructions
}
```

### Entry Point

```typescript
processQuery(query: string, focusArea: string, conversationId: string)
  → { answer: string, sources: Source[], conversationId: string }
```

---

## Document Parsing & Indexing

**Supported:** PDF only (`application/pdf`). Non-PDF uploads rejected at API level.

**Indexing pipeline** (`rag/indexer.ts`):

```
1. Validate mimeType === "application/pdf" (reject otherwise)
2. Read file from uploads/
3. Parse with pdf-parse → text + page number metadata
4. Convert to LangChain Document[] with metadata:
   { documentId, documentName, pageNumber, focusArea }
5. Chunk with RecursiveCharacterTextSplitter
   (chunkSize: 200 tokens, chunkOverlap: 30, tiktoken encoder)
6. Embed with OpenAI text-embedding-ada-002
7. Store chunks in ChromaDB collection (named by focus area namespace)
8. Update Prisma record: status → INDEXED, chunkCount = N
```

**On document delete:**
1. Remove ChromaDB vectors filtered by `{ documentId }`
2. Delete file from `uploads/`
3. Delete Prisma record (cascades to nothing — documents have no child models)

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/focus-areas` | GET | List all focus areas |
| `/api/documents` | GET | List documents (paginated, filterable by focusArea + search) |
| `/api/documents` | POST | Upload PDF — save to `uploads/`, create UPLOADING record |
| `/api/documents/[id]` | DELETE | Remove file + Prisma record + ChromaDB vectors |
| `/api/documents/index` | POST | Trigger indexing pipeline for a document |
| `/api/chat` | POST | Send message → RAG graph → save messages → return response |
| `/api/conversations` | GET | List conversations (filterable by focusArea) |
| `/api/conversations/[id]` | GET | Get conversation with full message history |
| `/api/conversations/[id]` | DELETE | Delete conversation + messages (cascade) |
| `/api/conversations/[id]/instructions` | GET | List instructions associated with a conversation |
| `/api/conversations/[id]/instructions` | POST | Associate instruction(s) to a conversation |
| `/api/conversations/[id]/instructions/[instructionId]` | DELETE | Remove instruction from conversation |
| `/api/instructions` | GET | List instructions (filterable by focusArea) |
| `/api/instructions` | POST | Create instruction |
| `/api/instructions/[id]` | PUT | Update instruction |
| `/api/instructions/[id]` | DELETE | Delete instruction |

**Chat request shape:**
```typescript
{
  question: string
  focusArea: string
  conversationId?: string   // omit to start a new conversation
}
```

**Retrieval scope:** All indexed documents in the selected focus area's ChromaDB collection. No per-message or per-conversation document filtering — the focus area is the retrieval boundary.

Instructions are conversation-scoped — the chat API loads all instructions associated with the conversation automatically. No `instructionId` in the request body.

**Upload flow (two-step):**
1. `POST /api/documents` — saves file, creates record with status `UPLOADING`
2. `POST /api/documents/index` — parses, chunks, embeds, marks `INDEXED`

Two steps allow the UI to show progress between upload and indexing.

---

## Frontend Structure

### Pages

| Route | Purpose |
|---|---|
| `/` | Redirect to `/chat` |
| `/chat` | New conversation — focus area selector + input |
| `/chat/[conversationId]` | Existing conversation with history |
| `/documents` | Document management |
| `/instructions` | Instruction management |

### Components

```
components/
  layout/
    sidebar.tsx               Navigation, conversation list (grouped by date), New Chat
    header.tsx                App title, active focus area display
    app-shell.tsx             Sidebar + main content wrapper

  chat/
    chat-view.tsx             Container: message list + input + sources panel
    chat-input.tsx            Text input, focus area selector, send button
    message-list.tsx          Scrollable message history
    message-bubble.tsx        User/assistant bubble with markdown + source links
    sources-panel.tsx         Cited sources with page numbers
    conversation-list.tsx     Sidebar list of past conversations
    instruction-picker.tsx    Conversation-level popover to attach/detach instructions

  documents/
    document-table.tsx        TanStack Table: name, status, size, date, actions
    upload-dialog.tsx         Drag-and-drop upload with focus area selector
    document-status.tsx       Status badge (UPLOADING / INDEXING / INDEXED / FAILED)
    pdf-viewer.tsx            react-pdf viewer

  instructions/
    instruction-list.tsx      Table with create/edit/delete actions
    instruction-dialog.tsx    Create/edit dialog with TipTap rich text editor

  focus-area-selector.tsx     Reusable focus area dropdown
  markdown-renderer.tsx       react-markdown + remark-gfm + rehype-highlight + DOMPurify
```

### State

- **Zustand:** `useFocusAreaStore` (selected focus area), `useChatStore` (messages, pending state per conversation)
- **TanStack Query:** all server state — documents, conversations, instructions, focus areas

---

## Environment Variables

```env
# OpenAI
OPENAI_API_KEY=

# ChromaDB
CHROMA_URL=http://localhost:8000

# Models
CHAT_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-ada-002

# App
UPLOAD_DIR=./uploads
```

---

## Project Structure

```
simple-rag/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
├── uploads/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── chat/
│   │   ├── page.tsx
│   │   └── [conversationId]/page.tsx
│   ├── documents/page.tsx
│   ├── instructions/page.tsx
│   └── api/
│       ├── chat/route.ts
│       ├── conversations/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── instructions/
│       │           ├── route.ts
│       │           └── [instructionId]/route.ts
│       ├── documents/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── index/route.ts
│       ├── focus-areas/route.ts
│       └── instructions/
│           ├── route.ts
│           └── [id]/route.ts
├── lib/
│   ├── prisma.ts
│   ├── chroma.ts
│   ├── llm.ts
│   ├── embeddings.ts
│   └── env.ts
├── rag/
│   ├── graph.ts
│   ├── state.ts
│   ├── prompts.ts
│   ├── chunker.ts
│   ├── indexer.ts
│   └── nodes/
│       ├── refine-query.ts
│       ├── retrieve.ts
│       ├── grade-documents.ts
│       └── generate.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── chat/
│   ├── documents/
│   ├── instructions/
│   ├── focus-area-selector.tsx
│   └── markdown-renderer.tsx
├── store/
│   ├── use-chat-store.ts
│   └── use-focus-area-store.ts
├── hooks/
│   └── api/
│       ├── use-chat.ts
│       ├── use-conversations.ts
│       ├── use-documents.ts
│       ├── use-focus-areas.ts
│       └── use-instructions.ts
├── types/index.ts
├── .env.local
├── .env.example
├── docker-compose.yml
└── package.json
```

---

## Verification Checklist

1. `npx prisma validate` — no schema errors
2. `npx prisma db seed` — 3 focus areas created
3. ChromaDB heartbeat: `GET http://localhost:8000/api/v1/heartbeat` returns 200
4. Upload a PDF → verify status moves UPLOADING → INDEXING → INDEXED
5. Send a chat message → verify refined queries → retrieved docs → graded → answer with citations
6. Verify retrieval is scoped to selected focus area only
7. Refresh page → conversation history loads from SQLite
8. Associate an instruction with a conversation → verify it appears in system prompt (observe response behavior)
9. Delete a document → verify vectors removed from ChromaDB
10. `npm run build` — no TypeScript errors
