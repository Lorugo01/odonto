import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { CreateClinicalNoteDto, UpdateClinicalNoteDto } from "./dto/clinical-notes.dto";

type NoteRow = {
  id: string;
  patientProfileId: string;
  appointmentId: string | null;
  body: string;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorUserId: string | null;
  author: { name: string } | null;
  appointment: { startsAt: Date; service: { name: string } } | null;
};

const includeRelations = {
  author: { select: { name: true } },
  appointment: { select: { startsAt: true, service: { select: { name: true } } } },
} as const;

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, patientProfileId: string) {
    if (!patientProfileId) throw new BadRequestException("Paciente obrigatório");
    await this.assertPatientInClinic(user, patientProfileId);
    const rows = await this.prisma.clinicalNote.findMany({
      where: { clinicId: user.clinicId, patientProfileId },
      include: includeRelations,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => this.map(row, user));
  }

  async create(user: AuthUser, dto: CreateClinicalNoteDto) {
    await this.assertPatientInClinic(user, dto.patientProfileId);

    // A consulta vinculada precisa ser do mesmo paciente e da mesma clínica.
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: dto.appointmentId,
          clinicId: user.clinicId,
          patientProfileId: dto.patientProfileId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!appointment) throw new BadRequestException("Consulta inválida para este paciente");
    }

    const created = await this.prisma.clinicalNote.create({
      data: {
        clinicId: user.clinicId,
        patientProfileId: dto.patientProfileId,
        appointmentId: dto.appointmentId ?? null,
        // A autoria vem sempre do token, nunca do corpo da requisição.
        authorUserId: user.userId,
        body: dto.body.trim(),
      },
      include: includeRelations,
    });
    await this.audit(user, "CREATE", created.id);
    return this.map(created, user);
  }

  async update(user: AuthUser, id: string, dto: UpdateClinicalNoteDto) {
    const existing = await this.findOwn(user, id);
    const updated = await this.prisma.clinicalNote.update({
      where: { id: existing.id },
      data: { body: dto.body.trim() },
      include: includeRelations,
    });
    await this.audit(user, "UPDATE", updated.id);
    return this.map(updated, user);
  }

  async sign(user: AuthUser, id: string) {
    const existing = await this.findOwn(user, id);
    const signed = await this.prisma.clinicalNote.update({
      where: { id: existing.id },
      data: { signedAt: new Date() },
      include: includeRelations,
    });
    await this.audit(user, "SIGN", signed.id);
    return this.map(signed, user);
  }

  /** Evolução editável: existe na clínica, é do autor e ainda não foi assinada. */
  private async findOwn(user: AuthUser, id: string) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true, authorUserId: true, signedAt: true },
    });
    if (!note) throw new NotFoundException("Evolução não encontrada");
    if (note.authorUserId !== user.userId) {
      throw new ForbiddenException("Somente o autor pode alterar esta evolução");
    }
    if (note.signedAt) {
      throw new ForbiddenException("Evolução assinada não pode ser alterada");
    }
    return note;
  }

  /** Garante que o paciente está vinculado à clínica do token. */
  private async assertPatientInClinic(user: AuthUser, patientProfileId: string) {
    const link = await this.prisma.clinicPatient.findUnique({
      where: {
        clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId },
      },
      select: { deletedAt: true },
    });
    if (!link || link.deletedAt) throw new NotFoundException("Paciente não encontrado");
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "ClinicalNote",
        entityId,
      },
    });
  }

  private map(row: NoteRow, user: AuthUser) {
    return {
      id: row.id,
      patientProfileId: row.patientProfileId,
      body: row.body,
      authorName: row.author?.name ?? "Profissional removido",
      signedAt: row.signedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      appointment: row.appointment
        ? {
            id: row.appointmentId,
            startsAt: row.appointment.startsAt.toISOString(),
            serviceName: row.appointment.service.name,
          }
        : null,
      /** Conveniência para a UI não recalcular a regra de edição. */
      canEdit: row.authorUserId === user.userId && row.signedAt === null,
    };
  }
}
