-- AlterTable: emissão de documentos (receita, atestado, declaração) com autor e corpo impresso
ALTER TABLE "Document" ADD COLUMN "authorUserId" TEXT;
ALTER TABLE "Document" ADD COLUMN "content" TEXT;
ALTER TABLE "Document" ADD COLUMN "data" JSONB;

-- CreateIndex
CREATE INDEX "Document_clinicId_createdAt_idx" ON "Document"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
