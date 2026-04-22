import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")

  const conversations = await prisma.conversation.findMany({
    where: focusArea ? { focusArea: { namespace: focusArea } } : {},
    include: { focusArea: true },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(conversations)
}
