-- CreateTable
CREATE TABLE "PatientChart" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "chartNumber" TEXT,
    "maritalStatus" TEXT,
    "phoneHome" TEXT,
    "phoneWork" TEXT,
    "phoneMobile" TEXT,
    "address" TEXT,
    "insurance" TEXT,
    "referredBy" TEXT,
    "allergyAntibiotic" BOOLEAN NOT NULL DEFAULT false,
    "allergyAnesthetic" BOOLEAN NOT NULL DEFAULT false,
    "allergyDetails" TEXT,
    "medSensitivity" BOOLEAN,
    "medSensitivityDetails" TEXT,
    "highBloodPressure" BOOLEAN,
    "highBloodPressureDetails" TEXT,
    "takingMedication" BOOLEAN,
    "takingMedicationDetails" TEXT,
    "healthProblems" BOOLEAN,
    "healthProblemsDetails" TEXT,
    "observations" TEXT,
    "odontogram" JSONB NOT NULL DEFAULT '{}',
    "treatmentPlan" TEXT,
    "planDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientChart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientChart_clinicId_idx" ON "PatientChart"("clinicId");
CREATE UNIQUE INDEX "PatientChart_clinicId_patientProfileId_key" ON "PatientChart"("clinicId", "patientProfileId");

ALTER TABLE "PatientChart" ADD CONSTRAINT "PatientChart_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientChart" ADD CONSTRAINT "PatientChart_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
