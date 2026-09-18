-- AlterEnum: solicitação do paciente aguardando aprovação da clínica.
-- Isolado em migration própria porque o Postgres não aceita ALTER TYPE ADD VALUE
-- junto de outros comandos no mesmo bloco.
ALTER TYPE "AppointmentStatus" ADD VALUE 'REQUESTED' BEFORE 'SCHEDULED';
