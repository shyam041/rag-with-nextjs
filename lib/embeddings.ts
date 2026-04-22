import { OpenAIEmbeddings } from "@langchain/openai"
import { env } from "@/lib/env"

export function getEmbeddings() {
  return new OpenAIEmbeddings({
    model: env.EMBEDDING_MODEL,
    apiKey: env.OPENAI_API_KEY,
  })
}
