import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      focusArea: true,
    },
  })
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...conversation,
    messages: conversation.messages.map((m) => ({
      ...m,
      sources: m.sources ? JSON.parse(m.sources) : null,
    })),
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.conversation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
