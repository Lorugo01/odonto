import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  DOCUMENT_TEMPLATES,
  DocumentTypeCode,
  IssueContext,
} from "../src/modules/documents/documents.templates";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha123", 10);

  const clinicBranding = {
    name: "Clínica Sorriso",
    timezone: "America/Sao_Paulo",
    status: "ACTIVE" as const,
    legalName: "Clínica Odontológica Sorriso Ltda",
    cnpj: "12.345.678/0001-90",
    phone: "(11) 4000-1234",
    email: "contato@sorriso.com",
    address: "Rua das Flores, 120 — Centro, São Paulo/SP",
    website: "https://sorriso.example",
    primaryColor: "#0D9488",
    documentFooter: "Clínica Sorriso · CRO-SP Clínica 12345",
  };

  const clinic = await prisma.clinic.upsert({
    where: { slug: "sorriso" },
    update: clinicBranding,
    create: {
      slug: "sorriso",
      ...clinicBranding,
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

  const extraction = await upsertService({
    name: "Extração",
    description: "Remoção dentária simples ou cirúrgica, com sutura quando necessário.",
    durationMin: 40,
    priceCents: 35000,
  });
  const canal = await upsertService({
    name: "Tratamento de canal",
    description: "Endodontia em sessão única ou múltipla, com radiografia de controle.",
    durationMin: 60,
    priceCents: 78000,
  });
  const bleaching = await upsertService({
    name: "Clareamento",
    description: "Clareamento em consultório com moldeira de reforço.",
    durationMin: 50,
    priceCents: 45000,
  });

  for (const serviceId of [extraction.id, canal.id, bleaching.id, cleaning.id]) {
    await prisma.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId: professional.id, serviceId } },
      update: { active: true },
      create: { professionalId: professional.id, serviceId, active: true },
    });
  }

  // Paciente completo para testar ficha, agenda, evoluções e emissão de documentos.
  const helenaUser = await prisma.user.upsert({
    where: { email: "helena.costa@email.com" },
    update: { name: "Helena Costa", consentAt: new Date() },
    create: {
      email: "helena.costa@email.com",
      name: "Helena Costa",
      passwordHash,
      consentAt: new Date(),
    },
  });
  await prisma.userClinicRole.upsert({
    where: {
      userId_clinicId_role: { userId: helenaUser.id, clinicId: clinic.id, role: "PATIENT" },
    },
    update: {},
    create: { userId: helenaUser.id, clinicId: clinic.id, role: "PATIENT" },
  });

  const helenaBirth = new Date("1988-09-03T12:00:00");
  const helenaProfile =
    (await prisma.patientProfile.findUnique({ where: { userId: helenaUser.id } })) ??
    (await prisma.patientProfile.create({
      data: {
        userId: helenaUser.id,
        phone: "11987654321",
        birthDate: helenaBirth,
        notes: "Prefere consultas de manhã. Ansiedade leve em procedimentos cirúrgicos.",
      },
    }));
  await prisma.patientProfile.update({
    where: { id: helenaProfile.id },
    data: {
      phone: "11987654321",
      birthDate: helenaBirth,
      notes: "Prefere consultas de manhã. Ansiedade leve em procedimentos cirúrgicos.",
    },
  });
  await prisma.clinicPatient.upsert({
    where: {
      clinicId_patientProfileId: { clinicId: clinic.id, patientProfileId: helenaProfile.id },
    },
    update: { status: "ACTIVE", deletedAt: null },
    create: { clinicId: clinic.id, patientProfileId: helenaProfile.id },
  });

  const helenaChart = {
    chartNumber: "2026-0142",
    maritalStatus: "Casada",
    phoneHome: "1133334444",
    phoneWork: "1140028922",
    phoneMobile: "11987654321",
    address: "Rua das Acácias, 120 — Vila Mariana, São Paulo/SP",
    insurance: "Amil Dental 400",
    referredBy: "Dra. Paula Nunes",
    allergyAntibiotic: true,
    allergyAnesthetic: false,
    allergyDetails: "Alergia a amoxicilina. Usar clindamicina quando houver indicação.",
    medSensitivity: false,
    highBloodPressure: true,
    highBloodPressureDetails: "Controlada com losartana 50 mg.",
    takingMedication: true,
    takingMedicationDetails: "Losartana 50 mg 1x/dia. Sem anticoagulante.",
    healthProblems: true,
    healthProblemsDetails: "Hipertensão controlada. Sem diabetes.",
    observations: "Trazer exames de sangue atualizados em procedimentos cirúrgicos.",
    odontogram: {
      version: 1,
      teeth: {
        "18": { status: "ausente" },
        "16": { status: "carie", surfaces: { O: "carie" }, note: "Cárie oclusal profunda" },
        "26": { status: "restauracao", surfaces: { O: "restauracao", M: "restauracao" } },
        "36": { status: "canal", note: "Endodontia concluída" },
        "46": { status: "implante" },
        "28": { status: "extracao_indicada", note: "Siso incluso" },
        "11": { surfaces: { M: "restauracao" } },
      },
    } as Prisma.InputJsonValue,
    treatmentPlan:
      "1) Restaurar 16. 2) Extração do 28. 3) Manutenção do implante em 46. 4) Clareamento após a fase cirúrgica.",
    planDate: daysFromToday(-21),
  };
  await prisma.patientChart.upsert({
    where: {
      clinicId_patientProfileId: { clinicId: clinic.id, patientProfileId: helenaProfile.id },
    },
    update: helenaChart,
    create: {
      clinicId: clinic.id,
      patientProfileId: helenaProfile.id,
      ...helenaChart,
    },
  });

  const extractionAppt = await upsertAppointment({
    clinicId: clinic.id,
    professionalId: professional.id,
    patientProfileId: helenaProfile.id,
    serviceId: extraction.id,
    startsAt: daysFromToday(-14, 9, 0),
    durationMin: 40,
    status: "COMPLETED",
    patientNote: "Dor no siso inferior direito.",
  });
  const canalAppt = await upsertAppointment({
    clinicId: clinic.id,
    professionalId: professional.id,
    patientProfileId: helenaProfile.id,
    serviceId: canal.id,
    startsAt: daysFromToday(-7, 14, 30),
    durationMin: 60,
    status: "COMPLETED",
  });
  const todayAppt = await upsertAppointment({
    clinicId: clinic.id,
    professionalId: professional.id,
    patientProfileId: helenaProfile.id,
    serviceId: consult.id,
    startsAt: daysFromToday(0, 10, 0),
    durationMin: 30,
    status: "CONFIRMED",
    patientNote: "Revisão pós-extração e planejamento do clareamento.",
  });
  await upsertAppointment({
    clinicId: clinic.id,
    professionalId: professional.id,
    patientProfileId: helenaProfile.id,
    serviceId: cleaning.id,
    startsAt: daysFromToday(7, 11, 0),
    durationMin: 45,
    status: "REQUESTED",
    patientNote: "Gostaria de remarcar a limpeza para a semana que vem.",
  });
  await upsertAppointment({
    clinicId: clinic.id,
    professionalId: adminProfessional.id,
    patientProfileId: helenaProfile.id,
    serviceId: bleaching.id,
    startsAt: daysFromToday(21, 15, 0),
    durationMin: 50,
    status: "SCHEDULED",
  });

  await upsertNote({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    appointmentId: extractionAppt.id,
    body: "Extração do 48 sem intercorrências. Sutura simples. Prescrita dipirona e nimesulida. Retorno em 7 dias para remoção de pontos.",
    signedAt: daysFromToday(-14, 9, 45),
  });
  await upsertNote({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    appointmentId: canalAppt.id,
    body: "Endodontia do 36 concluída. Obturação em cone único. Paciente assintomática. Restauração provisória em resina.",
    signedAt: daysFromToday(-7, 15, 30),
  });

  const letterheadCtx: IssueContext = {
    patientName: "Helena Costa",
    patientBirthDate: helenaBirth,
    clinicName: clinic.name,
    authorName: dentistUser.name,
    authorCro: professional.cro,
    timezone: clinic.timezone,
  };

  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "RECEITA",
    appointmentId: extractionAppt.id,
    ctx: letterheadCtx,
    fields: {
      medications: [
        {
          name: "Dipirona 500 mg",
          quantity: "20 comprimidos",
          instructions: "1 comprimido a cada 6 horas, se dor, por até 3 dias.",
        },
        {
          name: "Nimesulida 100 mg",
          quantity: "10 comprimidos",
          instructions: "1 comprimido a cada 12 horas, após as refeições, por 5 dias.",
        },
        {
          name: "Clorexidina 0,12%",
          quantity: "1 frasco",
          instructions: "Bochecho de 10 ml por 1 minuto, 2 vezes ao dia, por 7 dias.",
        },
      ],
      notes: "Não usar amoxicilina (alergia relatada). Em caso de febre ou sangramento persistente, retornar.",
    },
  });
  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "ATESTADO",
    appointmentId: extractionAppt.id,
    ctx: letterheadCtx,
    fields: {
      days: 2,
      startDate: isoDateFrom(daysFromToday(-14)),
      reason: "Pós-operatório de extração dentária",
      cid: "K08.1",
    },
  });
  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "DECLARACAO",
    appointmentId: todayAppt.id,
    ctx: letterheadCtx,
    fields: {
      date: isoDateFrom(daysFromToday(0)),
      startTime: "10:00",
      endTime: "10:30",
    },
  });
  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "ENCAMINHAMENTO",
    appointmentId: canalAppt.id,
    ctx: letterheadCtx,
    fields: {
      specialty: "Periodontia",
      reason: "Avaliação de recessão gengival em 16 e 26, com possível indicação de enxerto.",
      findings: "Bolsa de 5 mm em vestibular de 16. Sangramento à sondagem. Higiene regular.",
    },
  });
  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "ORIENTACAO",
    appointmentId: extractionAppt.id,
    ctx: letterheadCtx,
    fields: {
      procedure: "Extração do dente 48",
      instructions:
        "Morder a gaze por 30 minutos. Dieta fria e pastosa nas primeiras 24 horas. Não bochechar com força. Não fumar. Compressa de gelo nas primeiras 6 horas. Retorno para remoção de pontos em 7 dias.",
    },
  });
  await issueSeedDocument({
    clinicId: clinic.id,
    patientProfileId: helenaProfile.id,
    authorUserId: dentistUser.id,
    type: "ANOTACAO",
    ctx: letterheadCtx,
    fields: {
      title: "Termo de ciência — alergia a antibiótico",
      body: "Paciente ciente da alergia a amoxicilina e da substituição por clindamicina em caso de infecção. Negou gestação. Autorizou o plano de extração do 28 e clareamento posterior.",
    },
  });

  console.log("Seed ok. Logins (senha: senha123):");
  console.log("  admin@sorriso.com (administradora + dentista)");
  console.log("  dentista@sorriso.com");
  console.log("  recepcao@sorriso.com");
  console.log("  paciente@email.com (João — cadastro simples)");
  console.log("  helena.costa@email.com (Helena — ficha, tratamentos e documentos completos)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function daysFromToday(offset: number, hour = 12, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isoDateFrom(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function upsertAppointment(data: {
  clinicId: string;
  professionalId: string;
  patientProfileId: string;
  serviceId: string;
  startsAt: Date;
  durationMin: number;
  status: "REQUESTED" | "SCHEDULED" | "CONFIRMED" | "COMPLETED";
  patientNote?: string;
}) {
  const existing = await prisma.appointment.findFirst({
    where: {
      clinicId: data.clinicId,
      patientProfileId: data.patientProfileId,
      serviceId: data.serviceId,
      status: data.status,
      deletedAt: null,
    },
  });
  const payload = {
    professionalId: data.professionalId,
    serviceId: data.serviceId,
    startsAt: data.startsAt,
    endsAt: new Date(data.startsAt.getTime() + data.durationMin * 60_000),
    status: data.status,
    patientNote: data.patientNote,
    deletedAt: null,
  };
  if (existing) {
    return prisma.appointment.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.appointment.create({
    data: {
      clinicId: data.clinicId,
      patientProfileId: data.patientProfileId,
      ...payload,
    },
  });
}

async function upsertNote(data: {
  clinicId: string;
  patientProfileId: string;
  authorUserId: string;
  appointmentId: string;
  body: string;
  signedAt: Date;
}) {
  const existing = await prisma.clinicalNote.findFirst({
    where: { appointmentId: data.appointmentId, patientProfileId: data.patientProfileId },
  });
  if (existing) {
    return prisma.clinicalNote.update({
      where: { id: existing.id },
      data: { body: data.body, signedAt: data.signedAt, authorUserId: data.authorUserId },
    });
  }
  return prisma.clinicalNote.create({ data });
}

async function issueSeedDocument(input: {
  clinicId: string;
  patientProfileId: string;
  authorUserId: string;
  type: DocumentTypeCode;
  appointmentId?: string;
  ctx: IssueContext;
  fields: Record<string, unknown>;
}) {
  const template = DOCUMENT_TEMPLATES[input.type];
  const existing = await prisma.document.findFirst({
    where: {
      clinicId: input.clinicId,
      patientProfileId: input.patientProfileId,
      type: input.type,
      content: { not: null },
    },
  });
  if (existing) return existing;

  const title = template.title(input.fields, input.ctx);
  const content = template.render(input.fields, input.ctx);
  return prisma.document.create({
    data: {
      clinicId: input.clinicId,
      patientProfileId: input.patientProfileId,
      authorUserId: input.authorUserId,
      title,
      type: input.type,
      content,
      data: {
        fields: input.fields,
        appointmentId: input.appointmentId ?? null,
        letterhead: {
          clinicName: input.ctx.clinicName,
          authorName: input.ctx.authorName,
          authorCro: input.ctx.authorCro,
          patientName: input.ctx.patientName,
        },
      } as Prisma.InputJsonValue,
    },
  });
}
