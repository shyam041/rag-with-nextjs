import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")

  const instructions = await prisma.instruction.findMany({
    where: focusArea ? { focusArea: { namespace: focusArea } } : {},
    include: { focusArea: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(instructions)
}

export async function POST(req: NextRequest) {
  const { title, content, focusAreaId } = await req.json()
  if (!title || !content || !focusAreaId) {
    return NextResponse.json({ error: "title, content, and focusAreaId are required" }, { status: 400 })
  }

  const instruction = await prisma.instruction.create({
    data: { title, content, focusAreaId },
  })
  return NextResponse.json(instruction, { status: 201 })
}
