import { ChromaClient } from "chromadb"
import { env } from "@/lib/env"

const globalForChroma = globalThis as unknown as { chroma: ChromaClient }

function chromaClientFromUrl(url: string): ChromaClient {
  const parsed = new URL(url)
  return new ChromaClient({
    ssl: parsed.protocol === "https:",
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
  })
}

export const chroma = globalForChroma.chroma ?? chromaClientFromUrl(env.CHROMA_URL)

if (process.env.NODE_ENV !== "production") globalForChroma.chroma = chroma

export async function getOrCreateCollection(name: string) {
  return chroma.getOrCreateCollection({ name })
}
