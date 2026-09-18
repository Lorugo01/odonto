import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { can, isPatientOnly } from "../../common/utils/permissions.util";
import { CreateDocumentDto, IssueDocumentDto } from "./dto/documents.dto";
import {
  DOCUMENT_TEMPLATES,
  DocumentTypeCode,
  IssueContext,
  IssueRole,
} from "./documents.templates";

const documentInclude = {
  patient: { include: { user: true } },
  author: { select: { name: true } },
} as const;

type DocumentRow = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, patientProfileId?: string) {
    const where: Prisma.DocumentWhereInput = { clinicId: user.clinicId };
    if (isPatientOnly(user)) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!profile) return [];
      where.patientProfileId = profile.id;
    } else if (patientProfileId) {
      where.patientProfileId = patientProfileId;
    }
    const rows = await this.prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapSummary(row));
  }

  /** Documento único, usado pela tela de impressão. */
  async get(user: AuthUser, id: string) {
    const row = await this.prisma.document.findFirst({
      where: { id, clinicId: user.clinicId },
      include: documentInclude,
    });
    if (!row) throw new NotFoundException("Documento não encontrado");
    if (isPatientOnly(user)) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!profile || profile.id !== row.patientProfileId) throw new ForbiddenException();
    }
    return this.mapDetail(row);
  }

  async create(user: AuthUser, dto: CreateDocumentDto) {
    if (isPatientOnly(user)) throw new ForbiddenException();
    await this.assertPatientInClinic(user, dto.patientProfileId);
    const created = await this.prisma.document.create({
      data: {
        clinicId: user.clinicId,
        patientProfileId: dto.patientProfileId,
        authorUserId: user.userId,
        title: dto.title,
        type: dto.type,
        url: dto.url,
      },
      include: documentInclude,
    });
    await this.audit(user, "CREATE", created.id);
    return this.mapSummary(created);
  }

  /**
   * Emite um documento a partir de um modelo. O corpo é renderizado no
   * servidor e guardado junto com um snapshot do timbre, porque o texto
   * impresso é o registro oficial e não deve mudar depois.
   */
  async issue(user: AuthUser, dto: IssueDocumentDto) {
    const template = DOCUMENT_TEMPLATES[dto.type as DocumentTypeCode];
    if (!template) throw new NotFoundException("Modelo de documento não encontrado");
    this.assertCanIssue(user, dto.type, template.roles);

    const profile = await this.assertPatientInClinic(user, dto.patientProfileId);

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
      if (!appointment) throw new NotFoundException("Consulta inválida para este paciente");
    }

    const [clinic, professional, author] = await Promise.all([
      this.prisma.clinic.findUniqueOrThrow({
        where: { id: user.clinicId },
        select: { name: true, timezone: true },
      }),
      this.prisma.professional.findUnique({
        where: { clinicId_userId: { clinicId: user.clinicId, userId: user.userId } },
        select: { cro: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.userId },
        select: { name: true },
      }),
    ]);

    const ctx: IssueContext = {
      patientName: profile.user.name,
      patientBirthDate: profile.birthDate,
      clinicName: clinic.name,
      authorName: author.name,
      authorCro: professional?.cro ?? null,
      timezone: clinic.timezone,
    };

    const title = template.title(dto.fields, ctx);
    const content = template.render(dto.fields, ctx);

    const created = await this.prisma.document.create({
      data: {
        clinicId: user.clinicId,
        patientProfileId: dto.patientProfileId,
        authorUserId: user.userId,
        title,
        type: dto.type,
        content,
        data: {
          fields: dto.fields,
          appointmentId: dto.appointmentId ?? null,
          letterhead: {
            clinicName: ctx.clinicName,
            authorName: ctx.authorName,
            authorCro: ctx.authorCro,
            patientName: ctx.patientName,
          },
        } as unknown as Prisma.InputJsonValue,
      },
      include: documentInclude,
    });
    await this.audit(user, "ISSUE", created.id);
    return this.mapDetail(created);
  }

  /** Receita e atestado são atos clínicos: recepção não emite. */
  private assertCanIssue(user: AuthUser, type: string, roles: IssueRole[]) {
    if (!can(user, ...roles)) {
      throw new ForbiddenException(
        `Seu perfil não pode emitir este tipo de documento (${DOCUMENT_TEMPLATES[type as DocumentTypeCode].label})`,
      );
    }
  }

  private async assertPatientInClinic(user: AuthUser, patientProfileId: string) {
    const profile = await this.prisma.patientProfile.findFirst({
      where: { id: patientProfileId, deletedAt: null },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException("Paciente não encontrado");
    const link = await this.prisma.clinicPatient.findUnique({
      where: {
        clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId },
      },
      select: { deletedAt: true },
    });
    if (!link || link.deletedAt) throw new NotFoundException("Paciente não encontrado");
    return profile;
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "Document",
        entityId,
      },
    });
  }

  private mapSummary(row: DocumentRow) {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      url: row.url,
      createdAt: row.createdAt.toISOString(),
      patientName: row.patient.user.name,
      authorName: row.author?.name ?? null,
      /** Só documentos emitidos por modelo têm corpo para imprimir. */
      printable: row.content !== null,
    };
  }

  private mapDetail(row: DocumentRow) {
    const letterhead = (row.data as { letterhead?: Record<string, unknown> } | null)?.letterhead;
    return {
      ...this.mapSummary(row),
      content: row.content,
      letterhead: {
        clinicName: (letterhead?.clinicName as string) ?? null,
        authorName: (letterhead?.authorName as string) ?? row.author?.name ?? null,
        authorCro: (letterhead?.authorCro as string) ?? null,
      },
    };
  }
}
