-- Expediente semanal de cada dentista (0 = domingo … 6 = sábado).
CREATE TABLE "ProfessionalHours" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "ProfessionalHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalHours_professionalId_weekday_key" ON "ProfessionalHours"("professionalId", "weekday");
CREATE INDEX "ProfessionalHours_professionalId_idx" ON "ProfessionalHours"("professionalId");

ALTER TABLE "ProfessionalHours" ADD CONSTRAINT "ProfessionalHours_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
