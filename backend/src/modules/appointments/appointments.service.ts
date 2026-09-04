import { AppointmentStatus } from "@prisma/client";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { CreateAppointmentDto, PatchAppointmentDto } from "./dto/appointments.dto";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private isPatient(user: AuthUser) {
    return user.role === "PATIENT";
  }

  async list(user: AuthUser, from?: string, to?: string) {
    const start = from ? new Date(from) : startOfDay(new Date());
    const end = to ? new Date(to) : endOfDay(new Date());
    const where: Record<string, unknown> = {
      clinicId: user.clinicId,
      deletedAt: null,
      startsAt: { gte: start, lte: end },
    };
    if (this.isPatient(user)) {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: user.userId } });
      if (!profile) return [];
      where.patientProfileId = profile.id;
    } else if (user.role === "DENTIST") {
      const pro = await this.prisma.professional.findUnique({
        where: { clinicId_userId: { clinicId: user.clinicId, userId: user.userId } },
      });
      if (pro) where.professionalId = pro.id;
    }
    const rows = await this.prisma.appointment.findMany({
      where,
      include: {
        professional: { include: { user: true } },
        patient: { include: { user: true } },
        service: true,
      },
      orderBy: { startsAt: "asc" },
    });
    return rows.map(mapAppointment);
  }

  async create(user: AuthUser, dto: CreateAppointmentDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, clinicId: user.clinicId },
    });
    if (!service) throw new NotFoundException("Serviço não encontrado");
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, clinicId: user.clinicId },
    });
    if (!professional) throw new NotFoundException("Profissional não encontrado");

    let patientProfileId = dto.patientProfileId;
    if (this.isPatient(user)) {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: user.userId } });
      if (!profile) throw new ForbiddenException();
      patientProfileId = profile.id;
    } else if (!patientProfileId) {
      throw new BadRequestException("Paciente obrigatório");
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        clinicId: user.clinicId,
        professionalId: professional.id,
        deletedAt: null,
        status: { notIn: ["CANCELLED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlap) throw new BadRequestException("Horário indisponível");

    const created = await this.prisma.appointment.create({
      data: {
        clinicId: user.clinicId,
        professionalId: professional.id,
        patientProfileId: patientProfileId!,
        serviceId: service.id,
        startsAt,
        endsAt,
      },
      include: {
        professional: { include: { user: true } },
        patient: { include: { user: true } },
        service: true,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action: "CREATE",
        entity: "Appointment",
        entityId: created.id,
      },
    });
    return mapAppointment(created);
  }

  async patch(user: AuthUser, id: string, dto: PatchAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, clinicId: user.clinicId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException();
    if (this.isPatient(user)) {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: user.userId } });
      if (!profile || existing.patientProfileId !== profile.id) throw new ForbiddenException();
      if (dto.status && dto.status !== "CANCELLED") {
        throw new ForbiddenException("Paciente só pode cancelar");
      }
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: dto.status ? { status: dto.status as AppointmentStatus } : {},
      include: {
        professional: { include: { user: true } },
        patient: { include: { user: true } },
        service: true,
      },
    });
    return mapAppointment(updated);
  }
}

function mapAppointment(row: {
  id: string;
  clinicId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  professional: { id: string; specialty: string | null; user: { name: string } };
  patient: { id: string; user: { name: string } };
  service: { id: string; name: string; durationMin: number };
}) {
  return {
    id: row.id,
    clinicId: row.clinicId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    professional: { id: row.professional.id, name: row.professional.user.name, specialty: row.professional.specialty },
    patient: { id: row.patient.id, name: row.patient.user.name },
    service: { id: row.service.id, name: row.service.name, durationMin: row.service.durationMin },
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
