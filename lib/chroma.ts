import { ChromaClient } from "chromadb"
import { env } from "@/lib/env"

const globalForChroma = globalThis as unknown as { chroma: ChromaClient }

export const chroma = globalForChroma.chroma ?? new ChromaClient({ path: env.CHROMA_URL })

if (process.env.NODE_ENV !== "production") globalForChroma.chroma = chroma

export async function getOrCreateCollection(name: string) {
  return chroma.getOrCreateCollection({ name })
}
