import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; instructionId: string }> }
) {
  const { id, instructionId } = await params

  await prisma.conversationInstruction.delete({
    where: { conversationId_instructionId: { conversationId: id, instructionId } },
  })
  return NextResponse.json({ success: true })
}
