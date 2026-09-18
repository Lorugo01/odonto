-- Identidade visual e dados comerciais da clínica (white-label por tenant).
ALTER TABLE "Clinic" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "phone" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "email" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "address" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "website" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#0D9488';
ALTER TABLE "Clinic" ADD COLUMN "documentFooter" TEXT;
