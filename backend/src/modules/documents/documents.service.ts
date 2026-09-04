import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  patientProfileId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  url?: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, patientProfileId?: string) {
    const where: { clinicId: string; patientProfileId?: string } = { clinicId: user.clinicId };
    if (user.role === "PATIENT") {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: user.userId } });
      if (!profile) return [];
      where.patientProfileId = profile.id;
    } else if (patientProfileId) {
      where.patientProfileId = patientProfileId;
    }
    const rows = await this.prisma.document.findMany({
      where,
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      url: d.url,
      createdAt: d.createdAt.toISOString(),
      patientName: d.patient.user.name,
    }));
  }

  async create(user: AuthUser, dto: CreateDocumentDto) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const created = await this.prisma.document.create({
      data: {
        clinicId: user.clinicId,
        patientProfileId: dto.patientProfileId,
        title: dto.title,
        type: dto.type,
        url: dto.url,
      },
      include: { patient: { include: { user: true } } },
    });
    return {
      id: created.id,
      title: created.title,
      type: created.type,
      url: created.url,
      createdAt: created.createdAt.toISOString(),
      patientName: created.patient.user.name,
    };
  }
}
