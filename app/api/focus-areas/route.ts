import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const focusAreas = await prisma.focusArea.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(focusAreas)
}
