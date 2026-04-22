import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const links = await prisma.conversationInstruction.findMany({
    where: { conversationId: id },
    include: { instruction: true },
  })
  return NextResponse.json(links.map((l) => l.instruction))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { instructionId } = await req.json()
  if (!instructionId) return NextResponse.json({ error: "instructionId required" }, { status: 400 })

  await prisma.conversationInstruction.upsert({
    where: { conversationId_instructionId: { conversationId: id, instructionId } },
    update: {},
    create: { conversationId: id, instructionId },
  })
  return NextResponse.json({ success: true })
}
