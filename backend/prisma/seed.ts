import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha123", 10);

  const clinic = await prisma.clinic.upsert({
    where: { slug: "sorriso" },
    update: {},
    create: {
      name: "Clínica Sorriso",
      slug: "sorriso",
      timezone: "America/Sao_Paulo",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@sorriso.com" },
    update: {},
    create: {
      email: "admin@sorriso.com",
      name: "Ana Admin",
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  const dentistUser = await prisma.user.upsert({
    where: { email: "dentista@sorriso.com" },
    update: {},
    create: {
      email: "dentista@sorriso.com",
      name: "Dr. Carlos Mendes",
      passwordHash,
    },
  });

  const reception = await prisma.user.upsert({
    where: { email: "recepcao@sorriso.com" },
    update: {},
    create: {
      email: "recepcao@sorriso.com",
      name: "Marina Recepção",
      passwordHash,
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: "paciente@email.com" },
    update: {},
    create: {
      email: "paciente@email.com",
      name: "João Paciente",
      passwordHash,
      consentAt: new Date(),
    },
  });

  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: admin.id, clinicId: clinic.id, role: "CLINIC_ADMIN" },
    },
    update: {},
    create: { userId: admin.id, clinicId: clinic.id, role: "CLINIC_ADMIN" },
  });
  // Papéis são acumuláveis: a administradora também atende como dentista.
  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: admin.id, clinicId: clinic.id, role: "DENTIST" },
    },
    update: {},
    create: { userId: admin.id, clinicId: clinic.id, role: "DENTIST" },
  });
  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: dentistUser.id, clinicId: clinic.id, role: "DENTIST" },
    },
    update: {},
    create: { userId: dentistUser.id, clinicId: clinic.id, role: "DENTIST" },
  });
  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: reception.id, clinicId: clinic.id, role: "RECEPTION" },
    },
    update: {},
    create: { userId: reception.id, clinicId: clinic.id, role: "RECEPTION" },
  });
  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: patientUser.id, clinicId: clinic.id, role: "PATIENT" },
    },
    update: {},
    create: { userId: patientUser.id, clinicId: clinic.id, role: "PATIENT" },
  });

  const professional = await prisma.professional.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: dentistUser.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: dentistUser.id,
      cro: "CRO-SP 12345",
      specialty: "Clínico geral",
    },
  });

  const adminProfessional = await prisma.professional.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: admin.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: admin.id,
      cro: "CRO-SP 54321",
      specialty: "Implantodontia",
    },
  });

  /** Cria ou atualiza um serviço do catálogo pelo nome. */
  async function upsertService(data: {
    name: string;
    description: string;
    durationMin: number;
    priceCents: number;
  }) {
    const found = await prisma.service.findFirst({
      where: { clinicId: clinic.id, name: data.name },
    });
    if (found) {
      return prisma.service.update({
        where: { id: found.id },
        data: { description: data.description },
      });
    }
    return prisma.service.create({ data: { clinicId: clinic.id, ...data } });
  }

  const consult = await upsertService({
    name: "Consulta de avaliação",
    description: "Exame clínico inicial, diagnóstico e plano de tratamento.",
    durationMin: 30,
    priceCents: 15000,
  });
  const cleaning = await upsertService({
    name: "Limpeza",
    description: "Remoção de placa e tártaro, polimento e aplicação de flúor.",
    durationMin: 45,
    priceCents: 22000,
  });

  // Tratamentos atendidos por cada dentista, com ajustes próprios.
  for (const [pro, services] of [
    [professional.id, [consult.id, cleaning.id]],
    [adminProfessional.id, [consult.id]],
  ] as const) {
    for (const serviceId of services) {
      await prisma.professionalService.upsert({
        where: { professionalId_serviceId: { professionalId: pro, serviceId } },
        update: {},
        create: { professionalId: pro, serviceId, active: true },
      });
    }
  }
  await prisma.professionalService.update({
    where: {
      professionalId_serviceId: {
        professionalId: adminProfessional.id,
        serviceId: consult.id,
      },
    },
    data: {
      description: "Avaliação voltada a implantes, com análise de enxerto ósseo.",
      durationMin: 60,
      priceCents: 30000,
    },
  });

  const profile =
    (await prisma.patientProfile.findUnique({ where: { userId: patientUser.id } })) ??
    (await prisma.patientProfile.create({
      data: {
        userId: patientUser.id,
        phone: "11999990000",
        birthDate: new Date("1992-04-12"),
      },
    }));

  await prisma.clinicPatient.upsert({
    where: {
      clinicId_patientProfileId: { clinicId: clinic.id, patientProfileId: profile.id },
    },
    update: {},
    create: { clinicId: clinic.id, patientProfileId: profile.id },
  });

  const start = new Date();
  start.setHours(10, 0, 0, 0);
  const existingAppt = await prisma.appointment.findFirst({
    where: { clinicId: clinic.id, patientProfileId: profile.id, startsAt: start },
  });
  if (!existingAppt) {
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        professionalId: professional.id,
        patientProfileId: profile.id,
        serviceId: consult.id,
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60_000),
        status: "CONFIRMED",
      },
    });
  }

  const existingDoc = await prisma.document.findFirst({
    where: { clinicId: clinic.id, patientProfileId: profile.id, title: "Receita - higiene" },
  });
  if (!existingDoc) {
    await prisma.document.create({
      data: {
        clinicId: clinic.id,
        patientProfileId: profile.id,
        title: "Receita - higiene",
        type: "receita",
        url: "https://example.com/receita.pdf",
      },
    });
  }

  console.log("Seed ok. Logins (senha: senha123):");
  console.log("  admin@sorriso.com (administradora + dentista)");
  console.log("  dentista@sorriso.com");
  console.log("  recepcao@sorriso.com");
  console.log("  paciente@email.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
