import { ChatOpenAI } from "@langchain/openai"
import { env } from "@/lib/env"

export function getLLM(temperature = 0) {
  return new ChatOpenAI({
    model: env.CHAT_MODEL,
    temperature,
    apiKey: env.OPENAI_API_KEY,
  })
}
