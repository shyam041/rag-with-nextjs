-- CreateTable
CREATE TABLE "FocusArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namespace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chromaCollection" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "focusAreaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "focusAreaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Instruction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "focusAreaId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Instruction_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationInstruction" (
    "conversationId" TEXT NOT NULL,
    "instructionId" TEXT NOT NULL,

    PRIMARY KEY ("conversationId", "instructionId"),
    CONSTRAINT "ConversationInstruction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationInstruction_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "Instruction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FocusArea_namespace_key" ON "FocusArea"("namespace");

-- CreateIndex
CREATE UNIQUE INDEX "FocusArea_chromaCollection_key" ON "FocusArea"("chromaCollection");
