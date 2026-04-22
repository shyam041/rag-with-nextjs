import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title, content, isActive } = await req.json()

  const instruction = await prisma.instruction.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(isActive !== undefined && { isActive }) },
  })
  return NextResponse.json(instruction)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.instruction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
