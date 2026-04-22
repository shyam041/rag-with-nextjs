import "server-only"
import { z } from "zod"

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  CHROMA_URL: z.string().url().default("http://localhost:8000"),
  CHAT_MODEL: z.string().min(1).default("gpt-4o"),
  EMBEDDING_MODEL: z.string().min(1).default("text-embedding-ada-002"),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  DATABASE_URL: z.string().min(1),
})

const _parsed = envSchema.safeParse(process.env)
if (!_parsed.success) {
  console.error("❌ Invalid environment variables:\n", _parsed.error.format())
  throw new Error("Invalid environment variables — see above for details")
}

export const env = _parsed.data
