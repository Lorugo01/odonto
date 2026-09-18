-- AlterTable: catálogo de serviços com descrição e arquivamento
ALTER TABLE "Service" ADD COLUMN "description" TEXT;
ALTER TABLE "Service" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: motivo informado pelo paciente na solicitação
ALTER TABLE "Appointment" ADD COLUMN "patientNote" TEXT;

-- CreateTable: tratamentos atendidos por cada dentista
CREATE TABLE "ProfessionalService" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,
    "priceCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalService_professionalId_serviceId_key" ON "ProfessionalService"("professionalId", "serviceId");
CREATE INDEX "ProfessionalService_serviceId_idx" ON "ProfessionalService"("serviceId");
CREATE INDEX "Service_clinicId_active_idx" ON "Service"("clinicId", "active");

-- AddForeignKey
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
