import { z } from "zod"

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  CHROMA_URL: z.string().url().default("http://localhost:8000"),
  CHAT_MODEL: z.string().default("gpt-4o"),
  EMBEDDING_MODEL: z.string().default("text-embedding-ada-002"),
  UPLOAD_DIR: z.string().default("./uploads"),
  DATABASE_URL: z.string().min(1),
})

export const env = envSchema.parse(process.env)
