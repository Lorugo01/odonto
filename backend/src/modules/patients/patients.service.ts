import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { CreatePatientDto } from "./dto/patients.dto";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const links = await this.prisma.clinicPatient.findMany({
      where: { clinicId: user.clinicId, deletedAt: null, status: "ACTIVE" },
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return links.map((l) => mapPatient(l.patient));
  }

  async get(user: AuthUser, id: string) {
    const profile = await this.prisma.patientProfile.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException();
    if (user.role === "PATIENT") {
      if (profile.userId !== user.userId) throw new ForbiddenException();
    }
    const link = await this.prisma.clinicPatient.findUnique({
      where: { clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId: id } },
    });
    if (!link) throw new NotFoundException();
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId: user.clinicId, patientProfileId: id, deletedAt: null },
      include: {
        professional: { include: { user: true } },
        patient: { include: { user: true } },
        service: true,
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
    const documents = await this.prisma.document.findMany({
      where: { clinicId: user.clinicId, patientProfileId: id },
      orderBy: { createdAt: "desc" },
    });
    return {
      patient: mapPatient(profile),
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        status: a.status,
        professional: { name: a.professional.user.name },
        service: { name: a.service.name },
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        url: d.url,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async create(user: AuthUser, dto: CreatePatientDto) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.senha ?? "senha123", 10);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const result = await this.prisma.$transaction(async (tx) => {
      const u =
        existing ??
        (await tx.user.create({
          data: { email, name: dto.name, passwordHash, consentAt: new Date() },
        }));
      const profile =
        (await tx.patientProfile.findUnique({ where: { userId: u.id } })) ??
        (await tx.patientProfile.create({ data: { userId: u.id, phone: dto.phone } }));
      await tx.userClinicRole.upsert({
        where: { userId_clinicId_role: { userId: u.id, clinicId: user.clinicId, role: "PATIENT" } },
        create: { userId: u.id, clinicId: user.clinicId, role: "PATIENT" },
        update: {},
      });
      await tx.clinicPatient.upsert({
        where: { clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId: profile.id } },
        create: { clinicId: user.clinicId, patientProfileId: profile.id },
        update: { deletedAt: null, status: "ACTIVE" },
      });
      return tx.patientProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: { user: true },
      });
    });
    return mapPatient(result);
  }
}

function mapPatient(p: { id: string; phone: string | null; birthDate: Date | null; user: { name: string; email: string } }) {
  return {
    id: p.id,
    name: p.user.name,
    email: p.user.email,
    phone: p.phone,
    birthDate: p.birthDate?.toISOString() ?? null,
  };
}
