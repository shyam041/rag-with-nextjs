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

type Env = z.infer<typeof envSchema>

let _env: Env | undefined

function getEnv(): Env {
  if (_env) return _env

  // During Next.js build, skip validation — env vars are only needed at runtime
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return process.env as unknown as Env
  }

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:\n", parsed.error.format())
    throw new Error("Invalid environment variables — see above for details")
  }
  _env = parsed.data
  return _env
}

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env]
  },
})
