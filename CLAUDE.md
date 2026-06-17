# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Next.js version warning:** This project uses Next.js 15 with breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code that touches routing, data fetching, or server/client boundaries.

---

## Quick Reference

| Need                        | Where                  | Command/Link                                                  |
| --------------------------- | ---------------------- | ------------------------------------------------------------- |
| **Start developing?**       | Run first              | `npm run dev` + `docker compose up -d`                        |
| **Build for production?**   | Catch errors           | `npm run build` (TypeScript errors will fail build)           |
| **Update database schema?** | `prisma/schema.prisma` | After changes: `npx prisma migrate dev`                       |
| **Seed initial data?**      | Focus areas            | `npx prisma db seed` (3 seeded: general, contracts, personal) |
| **Check database GUI?**     | Visual inspection      | `npx prisma studio` (opens http://localhost:5555)             |
| **Add new API route?**      | `app/api/`             | Follow existing pattern — use route handlers                  |
| **Add React component?**    | `components/`          | Use `"use client"` if interactive, else server component      |
| **Add query hook?**         | `hooks/api/`           | Use TanStack Query (useQuery, useMutation)                    |
| **Debug RAG pipeline?**     | `rag/nodes/`           | Add console.log to trace state through nodes                  |
| **Check ChromaDB health?**  | Port 8000              | `curl http://localhost:8000/api/v1/heartbeat`                 |
| **View document chunks?**   | ChromaDB data          | Use ChromaDB Python client or web UI                          |
| **Test TypeScript?**        | Before commit          | `npx tsc --noEmit`                                            |

---

## Development Commands

```bash
# Start dev server (http://localhost:3000)
npm run dev

# Production build (catches TypeScript errors)
npm run build

# Lint code
npm run lint

# Database setup
npx prisma migrate dev              # Apply schema changes
npx prisma db seed                  # Seed 3 focus areas
npx prisma studio                   # Open database GUI (http://localhost:5555)

# ChromaDB (vector store) — must run before app starts
docker compose up -d chromadb       # Start in background
docker compose logs chromadb         # View logs
docker compose down                 # Stop

# Check environment
echo $OPENAI_API_KEY                # Verify API key is set
curl http://localhost:8000/api/v1/heartbeat  # Verify ChromaDB running
```

**Required before first run:**

1. Copy `.env.example` to `.env.local` and fill in `OPENAI_API_KEY`
2. `docker compose up -d` (ChromaDB on port 8000)
3. `npx prisma migrate dev && npx prisma db seed`
4. `npm run dev`

---

## Architecture

Single Next.js 15 App Router application — no separate backend. All RAG logic runs in API route handlers on the server.

```
app/api/          API routes (server-only, never imported in client)
rag/              LangGraph RAG pipeline (server-only)
lib/              Singleton clients (Prisma, ChromaDB, OpenAI) — server-only
components/       React components (client or server)
store/            Zustand client state (client-only)
hooks/api/        TanStack Query hooks (client-only)
prisma/           Schema + migrations + SQLite dev.db
uploads/          Local PDF file storage
chroma-data/      ChromaDB persistent volume (gitignored)
```

**Stack:**

- **Next.js 15** (App Router) + React 19 — Framework
- **LangChain.js + LangGraph.js** — RAG orchestration
- **ChromaDB** (Docker) — Vector store, one collection per focus area
- **Prisma + SQLite** — Metadata, conversations, messages, instructions
- **pdf-parse** — PDF parsing (no Unstructured.io)
- **OpenAI** gpt-4o (LLM) + text-embedding-ada-002 (embeddings)
- **TanStack Query** — Server state caching; **Zustand** — UI state
- **shadcn/ui + Tailwind CSS v4** — UI components

**Key constraints:**

- **PDF only** — Non-PDF uploads rejected at API level (`mimeType` validation)
- **No streaming** — All responses returned as complete JSON
- **No auth** — Single-user, open access
- **Local file storage** — `uploads/` directory (not cloud blob)
- **Server packages** — `pdf-parse`, `chromadb`, `@prisma/client` marked as `serverExternalPackages` in `next.config.ts` — **never import in client components**

---

## Common Development Patterns

### Adding a New Feature

1. **Update schema** → `prisma/schema.prisma`

   ```bash
   npx prisma migrate dev    # Creates migration
   ```

2. **Create API route** → `app/api/[feature]/route.ts`
   - Use `NextRequest` and `NextResponse`
   - Handle GET, POST, DELETE, PUT as needed
   - Error handling with try-catch → `NextResponse.json({ error: ... }, { status: 500 })`

3. **Create TanStack Query hook** → `hooks/api/use-[feature].ts`
   - Wrap API route with `useQuery` or `useMutation`
   - Auto-invalidate cache with `queryClient.invalidateQueries()`

4. **Create React components** → `components/[feature]/`
   - Use `"use client"` only if interactive (state, event handlers)
   - Server components are default
   - Compose with shadcn/ui components

5. **Add page if new route** → `app/[feature]/page.tsx`
   - Import components, wrap with `AppShell` for layout

### Debugging the RAG Pipeline

**To trace query execution:**

1. Add `console.log()` in `rag/nodes/*.ts`:

   ```typescript
   export async function myNode(state: RAGState) {
     console.log("🔍 Node input:", {
       query: state.query,
       docCount: state.documents.length,
     });
     // ... node logic
     console.log("✅ Node output:", { llmResponse: result });
   }
   ```

2. Check the terminal output when you send a chat message

3. Verify ChromaDB has documents:

   ```bash
   curl -X POST http://localhost:8000/api/v1/collections/col_general/get \
     -H "Content-Type: application/json" \
     -d '{"where": {}}'
   ```

4. View database state:
   ```bash
   npx prisma studio    # Opens GUI at http://localhost:5555
   ```

**To test a single node:**

```typescript
// In app/api/debug/route.ts (temporary)
import { retrieve } from "@/rag/nodes/retrieve";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await retrieve({
    refinedQueries: body.queries,
    focusArea: body.focusArea,
    // ... other required state
  });
  return NextResponse.json(result);
}
```

### When to Rebuild vs. Hot Reload

| Situation                                 | Action                                        |
| ----------------------------------------- | --------------------------------------------- |
| **TypeScript error**                      | `npm run build` (catches all errors)          |
| **Code change in `app/`, `lib/`, `rag/`** | Auto-reload on save (Next.js dev server)      |
| **Env var change**                        | Restart `npm run dev`                         |
| **Prisma schema change**                  | `npx prisma migrate dev` + restart dev server |
| **New dependency**                        | `npm install` + restart dev server            |
| **`next.config.ts` change**               | Restart `npm run dev`                         |

### Working with ChromaDB Collections

**Collections created automatically on first use** — `rag/indexer.ts` calls `getOrCreateCollection(collectionName)`.

**To manually inspect/debug:**

```bash
# Python CLI (if ChromaDB installed locally)
chroma_cli get --host localhost --port 8000 --collection col_general

# Or use ChromaDB web UI (if available)
# http://localhost:8000 (may vary by ChromaDB version)

# Or use API directly
curl -X POST http://localhost:8000/api/v1/collections/col_general/query \
  -H "Content-Type: application/json" \
  -d '{"query_texts": ["your search term"], "n_results": 5}'
```

**To reset a collection:**

```bash
# Delete all vectors in a collection
curl -X DELETE http://localhost:8000/api/v1/collections/col_general
```

### Handling Document Uploads

**Two-step flow:**

1. **Upload** → `POST /api/documents`
   - File saved to `uploads/[timestamp]-[filename].pdf`
   - Prisma record created with `status: "UPLOADING"`

2. **Index** → `POST /api/documents/index`
   - Parses PDF with `pdf-parse`
   - Chunks with `RecursiveCharacterTextSplitter` (chunkSize: 1000, overlap: 200)
   - Embeds with OpenAI text-embedding-ada-002
   - Stores in ChromaDB collection for the focus area
   - Updates Prisma record with `status: "INDEXED"`, `chunkCount: N`

**To re-index a document:**

```bash
# Delete, then re-upload (will auto-re-index)
# Or directly call POST /api/documents/index with documentId
curl -X POST http://localhost:3000/api/documents/index \
  -H "Content-Type: application/json" \
  -d '{"documentId": "doc-id-here"}'
```

---

## RAG Pipeline (`rag/`)

Entry point: `processQuery(query, focusArea, conversationId)` in `rag/graph.ts`

**LangGraph flow:**

```
START
  ↓
refineDecomposeQueries (rewrite + decompose using history)
  ↓
retrieve (ChromaDB search, deduplicate)
  ↓
gradeDocuments (LLM relevance check)
  ↓
  ├─ relevant? → generate → END
  └─ not relevant + attempts < 2? → refineDecomposeQueries (retry)
  └─ not relevant + attempts ≥ 2? → generate → END
```

| File                           | Role                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `rag/graph.ts`                 | Compiled StateGraph + `processQuery` entry point                               |
| `rag/state.ts`                 | LangGraph `Annotation` state definition (RAGState)                             |
| `rag/nodes/refine-query.ts`    | Rewrites query using conversation history, decomposes into sub-queries         |
| `rag/nodes/retrieve.ts`        | ChromaDB similarity search (K=5, threshold=0.5), deduplicates by document ID   |
| `rag/nodes/grade-documents.ts` | LLM relevance grading (`relevant: true/false`), conditional routing            |
| `rag/nodes/generate.ts`        | Answer generation with Zod structured output (answer + citations + confidence) |
| `rag/indexer.ts`               | PDF parsing → chunking → embedding → ChromaDB storage                          |
| `rag/chunker.ts`               | RecursiveCharacterTextSplitter config (chunkSize: 1000, overlap: 200)          |
| `rag/prompts.ts`               | ChatPromptTemplate definitions for each node                                   |

**Active instructions** (conversation-scoped) are:

1. Loaded from `ConversationInstruction` join table
2. Injected into `generate` node's system prompt automatically
3. No client-side wiring needed — happens server-side in RAG pipeline

---

## Database Schema

SQLite via Prisma. Six models:

- **FocusArea** — Knowledge base namespace (3 seeded: `general`, `contracts`, `personal`). Each has a dedicated ChromaDB collection (`col_general`, `col_contracts`, `col_personal`).
- **Document** — Uploaded PDFs. Status flow: `UPLOADING → INDEXING → INDEXED / FAILED`. Includes `blobPath` (local file path), `chunkCount`, `fileSize`.
- **Conversation** — Chat session scoped to a focus area. Holds `title` (auto-generated from first message) and relationships to messages + instructions.
- **Message** — Single message in a conversation. Fields: `role` (`user`|`assistant`), `content`, `sources` (JSON array of source references).
- **Instruction** — Reusable system prompts scoped to a focus area. Fields: `title`, `content`, `isActive`.
- **ConversationInstruction** — Junction table: which instructions are active for a conversation (many-to-many).

**Key relationships:**

- Document deletion removes: ChromaDB vectors (filtered by `documentId`), file from `uploads/`, Prisma record.
- Conversation deletion cascades to: Message records.
- ConversationInstruction deletion cascades both ways (optional — normally just delete the junction).

**To view schema:**

```bash
npx prisma studio
```

---

## API Routes

**Two-step document upload:**

1. `POST /api/documents` — saves file, creates record (status `UPLOADING`)
2. `POST /api/documents/index` — parses/embeds (status `INDEXED`)

**Chat:** `POST /api/chat`

- Body: `{ question: string, focusArea: string, conversationId?: string }`
- Omit `conversationId` to create new conversation
- Returns: `{ conversationId, answer, sources }`

**Retrieval scope:** All indexed documents in the focus area's ChromaDB collection. No per-conversation document filtering — focus area is the retrieval boundary.

| Route                                                  | Methods     | Purpose                                      |
| ------------------------------------------------------ | ----------- | -------------------------------------------- |
| `/api/focus-areas`                                     | GET         | List all focus areas                         |
| `/api/documents`                                       | GET, POST   | List docs (paginated), upload PDF            |
| `/api/documents/[id]`                                  | DELETE      | Delete document + vectors + file             |
| `/api/documents/index`                                 | POST        | Trigger indexing pipeline                    |
| `/api/chat`                                            | POST        | Send message, run RAG, return response       |
| `/api/conversations`                                   | GET         | List conversations (filterable by focusArea) |
| `/api/conversations/[id]`                              | GET, DELETE | Get conversation + history, or delete        |
| `/api/conversations/[id]/instructions`                 | GET, POST   | List/attach instructions for conversation    |
| `/api/conversations/[id]/instructions/[instructionId]` | DELETE      | Remove instruction from conversation         |
| `/api/instructions`                                    | GET, POST   | List/create instructions                     |
| `/api/instructions/[id]`                               | PUT, DELETE | Update/delete instruction                    |

---

## Frontend

**Pages:**

- `/` → redirects to `/chat`
- `/chat` → new conversation
- `/chat/[conversationId]` → existing conversation with full history
- `/documents` → document management (upload, view, delete)
- `/instructions` → instruction management (CRUD)

**State split:**

- **Zustand** (`store/`): `useFocusAreaStore` (selected namespace), `useChatStore` (optimistic message list + pending per conversation)
- **TanStack Query** (`hooks/api/`): all server data with automatic caching and invalidation

**`lib/` singletons** — Import these, never instantiate directly:

- `lib/prisma.ts` — PrismaClient (global cache prevents hot-reload memory leaks)
- `lib/chroma.ts` — ChromaClient
- `lib/llm.ts` — ChatOpenAI factory
- `lib/embeddings.ts` — OpenAIEmbeddings factory
- `lib/env.ts` — Zod-validated env (build-phase bypass for dynamic checks)

**`next.config.ts`** marks these as `serverExternalPackages`:

- `pdf-parse` — PDF parsing library
- `chromadb` — Vector database client
- `@prisma/client` — Database client

**⚠️ Never import these in client components** — they contain Node.js APIs that break in the browser.

---

## Environment Variables

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# ChromaDB (Docker service)
CHROMA_URL=http://localhost:8000

# Models
CHAT_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-ada-002

# App
UPLOAD_DIR=./uploads

# Database (Prisma)
DATABASE_URL=file:./prisma/dev.db
```

**How to set:**

1. Copy `.env.example` → `.env.local`
2. Fill in `OPENAI_API_KEY` (get from https://platform.openai.com/api-keys)
3. Keep other values as defaults (localhost for ChromaDB, ./uploads for files)

---

## Before Committing Code

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Test smoke test (manual)
# — Upload a PDF
# — Send a chat message
# — Verify response with sources

# 5. Git commit
git add .
git commit -m "feat: [description]"
```

---

## Key Files to Know

| File                    | Purpose                | Edit if...                              |
| ----------------------- | ---------------------- | --------------------------------------- |
| `prisma/schema.prisma`  | Data model             | Adding new data types or relationships  |
| `rag/prompts.ts`        | LLM system prompts     | Changing how RAG nodes behave           |
| `rag/nodes/generate.ts` | Response generation    | Changing answer format or citations     |
| `lib/env.ts`            | Environment validation | Adding new env vars                     |
| `next.config.ts`        | Next.js config         | Adding new dependencies or build config |
| `.env.local`            | Local secrets          | Setting your API key / database URL     |

---

## Useful Commands Reference

```bash
# Development
npm run dev                      # Start dev server
npm run build                    # Build for production
npm run lint                     # Run linter

# Database
npx prisma migrate dev           # Create and apply migration
npx prisma db seed              # Run seed script
npx prisma studio               # Open database GUI
npx prisma validate             # Validate schema

# Docker (ChromaDB)
docker compose up -d             # Start ChromaDB
docker compose logs              # View logs
docker compose down              # Stop

# TypeScript
npx tsc --noEmit                # Type check without emit

# Git
git status                       # See changes
git diff                         # View detailed changes
git log --oneline               # View commit history
```

---

## References

| Document                                                 | Contains                                                |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `README.md`                                              | Setup, running, project overview                        |
| `docs/superpowers/specs/2026-04-22-simple-rag-design.md` | Full architectural spec, detailed schema, API contracts |
| `docs/superpowers/plans/2026-04-22-simple-rag.md`        | 22-task implementation checklist with concrete code     |

---

**Last updated:** 2026-04-23  
**Maintained by:** Shyam  
**Questions?** Check the spec or plan files above.
