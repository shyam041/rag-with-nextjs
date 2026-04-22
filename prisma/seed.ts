import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const focusAreas = [
    { namespace: "general", name: "General Knowledge", description: "General purpose knowledge base", chromaCollection: "col_general" },
    { namespace: "contracts", name: "Contract Analysis", description: "Legal contracts and agreements", chromaCollection: "col_contracts" },
    { namespace: "personal", name: "Personal Documents", description: "Personal reference documents", chromaCollection: "col_personal" },
  ]

  for (const fa of focusAreas) {
    await prisma.focusArea.upsert({
      where: { namespace: fa.namespace },
      update: {},
      create: fa,
    })
  }
  console.log("Seeded 3 focus areas")
}

main().catch(console.error).finally(() => prisma.$disconnect())
