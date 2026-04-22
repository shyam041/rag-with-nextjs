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

  await prisma.message.create({
    data: { conversationId: convoId, role: "user", content: question },
  })

  const result = await processQuery(question, focusArea, convoId)

  await prisma.message.create({
    data: {
      conversationId: convoId,
      role: "assistant",
      content: result.answer,
      sources: JSON.stringify(result.sources),
    },
  })

  await prisma.conversation.update({
    where: { id: convoId },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ ...result, conversationId: convoId })
}
