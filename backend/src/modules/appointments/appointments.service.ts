import { AppointmentStatus, Prisma } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { can, isPatientOnly } from "../../common/utils/permissions.util";
import { resolveTreatment } from "../treatments/treatments.util";
import { CreateAppointmentDto, PatchAppointmentDto } from "./dto/appointments.dto";

/** Situações que ainda ocupam a agenda do profissional. */
const BLOCKING_STATUSES: AppointmentStatus[] = ["REQUESTED", "SCHEDULED", "CONFIRMED"];

/** Transições permitidas; as situações finais não voltam atrás. */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ["SCHEDULED", "CONFIRMED", "CANCELLED"],
  SCHEDULED: ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

const includeRelations = {
  professional: { include: { user: true } },
  patient: { include: { user: true } },
  service: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, from?: string, to?: string) {
    const start = from ? new Date(from) : startOfDay(new Date());
    const end = to ? new Date(to) : endOfDay(new Date());
    const where: Prisma.AppointmentWhereInput = {
      clinicId: user.clinicId,
      deletedAt: null,
      startsAt: { gte: start, lte: end },
    };
    await this.applyScope(user, where);
    const rows = await this.prisma.appointment.findMany({
      where,
      include: includeRelations,
      orderBy: { startsAt: "asc" },
    });
    return rows.map(mapAppointment);
  }

  /** Solicitações pendentes, sem recorte por data, para a fila de aprovação. */
  async requests(user: AuthUser) {
    if (isPatientOnly(user)) throw new ForbiddenException();
    const where: Prisma.AppointmentWhereInput = {
      clinicId: user.clinicId,
      deletedAt: null,
      status: "REQUESTED",
    };
    await this.applyScope(user, where);
    const rows = await this.prisma.appointment.findMany({
      where,
      include: includeRelations,
      orderBy: { startsAt: "asc" },
    });
    return rows.map(mapAppointment);
  }

  /**
   * O paciente não marca a consulta: o pedido entra como `REQUESTED` e reserva
   * o horário até a clínica aprovar ou recusar.
   */
  async create(user: AuthUser, dto: CreateAppointmentDto) {
    const patientRequest = isPatientOnly(user);

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, clinicId: user.clinicId, active: true },
    });
    if (!service) throw new NotFoundException("Serviço não encontrado");

    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, clinicId: user.clinicId },
    });
    if (!professional) throw new NotFoundException("Profissional não encontrado");

    const treatment = await this.resolveOffer(professional.id, service);

    let patientProfileId = dto.patientProfileId;
    if (patientRequest) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!profile) throw new ForbiddenException();
      patientProfileId = profile.id;
    } else if (!patientProfileId) {
      throw new BadRequestException("Paciente obrigatório");
    }

    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException("Escolha um horário futuro");
    }
    const endsAt = new Date(startsAt.getTime() + treatment.durationMin * 60_000);

    const overlap = await this.prisma.appointment.findFirst({
      where: {
        clinicId: user.clinicId,
        professionalId: professional.id,
        deletedAt: null,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new BadRequestException("Horário indisponível");

    // Paciente não pode ficar em dois consultórios no mesmo período.
    const patientOverlap = await this.prisma.appointment.findFirst({
      where: {
        clinicId: user.clinicId,
        patientProfileId: patientProfileId as string,
        deletedAt: null,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (patientOverlap) {
      throw new BadRequestException("Você já tem um horário neste período");
    }

    const created = await this.prisma.appointment.create({
      data: {
        clinicId: user.clinicId,
        professionalId: professional.id,
        patientProfileId: patientProfileId as string,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: patientRequest ? "REQUESTED" : "SCHEDULED",
        patientNote: dto.patientNote?.trim() || null,
      },
      include: includeRelations,
    });
    await this.audit(user, patientRequest ? "REQUEST" : "CREATE", created.id);
    return mapAppointment(created);
  }

  async patch(user: AuthUser, id: string, dto: PatchAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, clinicId: user.clinicId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Consulta não encontrada");

    if (isPatientOnly(user)) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!profile || existing.patientProfileId !== profile.id) throw new ForbiddenException();
      if (dto.status && dto.status !== "CANCELLED") {
        throw new ForbiddenException("Paciente só pode cancelar a consulta");
      }
    }

    if (!dto.status) return mapAppointment(await this.findWithRelations(id));

    if (dto.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Não é possível alterar de ${statusText(existing.status)} para ${statusText(dto.status)}`,
        );
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
      include: includeRelations,
    });
    await this.audit(user, `STATUS_${dto.status}`, updated.id);
    return mapAppointment(updated);
  }

  /** Restringe a consulta ao paciente dono ou ao dentista responsável. */
  private async applyScope(user: AuthUser, where: Prisma.AppointmentWhereInput) {
    if (isPatientOnly(user)) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
      });
      // Sem perfil não há nada para listar; o id vazio garante resultado vazio.
      where.patientProfileId = profile?.id ?? "";
      return;
    }
    // Dentista sem papel administrativo vê apenas a própria agenda.
    if (can(user, "DENTIST") && !can(user, "CLINIC_ADMIN", "RECEPTION")) {
      const pro = await this.prisma.professional.findUnique({
        where: { clinicId_userId: { clinicId: user.clinicId, userId: user.userId } },
        select: { id: true },
      });
      where.professionalId = pro?.id ?? "";
    }
  }

  /**
   * Garante que o profissional atende o tratamento e devolve duração e preço
   * já resolvidos. Profissional sem tratamentos configurados continua
   * atendendo todo o catálogo, para não travar clínicas em implantação.
   */
  private async resolveOffer(
    professionalId: string,
    service: {
      id: string;
      name: string;
      description: string | null;
      durationMin: number;
      priceCents: number;
    },
  ) {
    const override = await this.prisma.professionalService.findUnique({
      where: { professionalId_serviceId: { professionalId, serviceId: service.id } },
    });
    if (!override?.active) {
      const configured = await this.prisma.professionalService.count({
        where: { professionalId, active: true },
      });
      if (configured > 0) {
        throw new BadRequestException("Este profissional não atende o tratamento escolhido");
      }
    }
    return resolveTreatment(service, override ?? null);
  }

  private findWithRelations(id: string) {
    return this.prisma.appointment.findUniqueOrThrow({ where: { id }, include: includeRelations });
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "Appointment",
        entityId,
      },
    });
  }
}

const STATUS_TEXT: Record<AppointmentStatus, string> = {
  REQUESTED: "solicitada",
  SCHEDULED: "agendada",
  CONFIRMED: "confirmada",
  CANCELLED: "cancelada",
  COMPLETED: "concluída",
  NO_SHOW: "falta",
};

function statusText(status: AppointmentStatus) {
  return STATUS_TEXT[status];
}

function mapAppointment(row: {
  id: string;
  clinicId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  patientNote: string | null;
  createdAt: Date;
  professional: { id: string; specialty: string | null; user: { name: string } };
  patient: { id: string; user: { name: string } };
  service: { id: string; name: string };
}) {
  return {
    id: row.id,
    clinicId: row.clinicId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    patientNote: row.patientNote,
    createdAt: row.createdAt.toISOString(),
    professional: {
      id: row.professional.id,
      name: row.professional.user.name,
      specialty: row.professional.specialty,
    },
    patient: { id: row.patient.id, name: row.patient.user.name },
    service: {
      id: row.service.id,
      name: row.service.name,
      // Duração real da consulta: o dentista pode ter sobrescrito a do catálogo.
      durationMin: Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000),
    },
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
