import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const focusArea = searchParams.get("focusArea")
  const search = searchParams.get("search") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 20

  const where = {
    ...(focusArea ? { focusArea: { namespace: focusArea } } : {}),
    ...(search ? { originalName: { contains: search } } : {}),
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { focusArea: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ documents, total, page, pageSize })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const focusAreaId = formData.get("focusAreaId") as string | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!focusAreaId) return NextResponse.json({ error: "focusAreaId required" }, { status: 400 })
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })

  const focusArea = await prisma.focusArea.findUnique({ where: { id: focusAreaId } })
  if (!focusArea) return NextResponse.json({ error: "Focus area not found" }, { status: 404 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
  const blobPath = path.join(env.UPLOAD_DIR, fileName)
  await writeFile(blobPath, buffer)

  const document = await prisma.document.create({
    data: {
      name: fileName,
      originalName: file.name,
      blobPath,
      focusAreaId,
      status: "UPLOADING",
      fileSize: file.size,
      mimeType: file.type,
    },
  })

  return NextResponse.json(document, { status: 201 })
}
