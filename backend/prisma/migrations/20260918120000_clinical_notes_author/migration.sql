-- AlterTable: identificação do autor, vínculo com a consulta e assinatura da evolução
ALTER TABLE "ClinicalNote" ADD COLUMN "authorUserId" TEXT;
ALTER TABLE "ClinicalNote" ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "ClinicalNote" ADD COLUMN "signedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClinicalNote_clinicId_patientProfileId_createdAt_idx" ON "ClinicalNote"("clinicId", "patientProfileId", "createdAt");
CREATE INDEX "ClinicalNote_appointmentId_idx" ON "ClinicalNote"("appointmentId");

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
